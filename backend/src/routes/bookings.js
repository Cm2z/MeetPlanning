
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit, notify } from '../utils/activity.js';

const router = Router();
const allowedStatuses = ['pending','approved','rejected','cancelled','checked_in','completed','no_show'];

async function hasConflict(roomId, startAt, endAt) {
  const [rows] = await pool.execute("SELECT id FROM bookings WHERE room_id = ? AND status IN ('pending','approved','checked_in') AND ? < end_at AND ? > start_at LIMIT 1", [roomId, startAt, endAt]);
  return rows.length > 0;
}

async function getRule(role) {
  const [[rule]] = await pool.execute('SELECT * FROM booking_rules WHERE role = ?', [role]);
  return rule || { max_hours: 2, advance_days: 30, allow_outside_hours: 0, work_start: '08:00:00', work_end: '18:00:00' };
}

function hoursBetween(startAt, endAt) {
  return (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3600000;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const params = [];
    let where = '1=1';
    if (req.query.mine === 'true') { where += ' AND b.user_id = ?'; params.push(req.user.id); }
    if (req.query.status) { where += ' AND b.status = ?'; params.push(req.query.status); }
    if (req.query.from) { where += ' AND b.end_at >= ?'; params.push(req.query.from); }
    if (req.query.to) { where += ' AND b.start_at <= ?'; params.push(req.query.to); }
    if (req.query.branchId) { where += ' AND r.branch_id = ?'; params.push(req.query.branchId); }
    if (req.query.roomId) { where += ' AND r.id = ?'; params.push(req.query.roomId); }
    if (req.query.requester) { where += ' AND u.name LIKE ?'; params.push('%' + req.query.requester + '%'); }
    const [rows] = await pool.execute('SELECT b.*, r.name AS room_name, r.building, r.floor, br.name AS branch_name, u.name AS requester_name, approver.name AS approver_name FROM bookings b JOIN rooms r ON r.id=b.room_id LEFT JOIN branches br ON br.id=r.branch_id JOIN users u ON u.id=b.user_id LEFT JOIN users approver ON approver.id=b.approved_by WHERE ' + where + ' ORDER BY b.start_at DESC LIMIT 300', params);
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/', requireAuth, body('roomId').isInt({ min: 1 }), body('title').notEmpty(), body('attendeeCount').isInt({ min: 1 }), body('startAt').isISO8601(), body('endAt').isISO8601(), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: 'กรุณากรอกข้อมูลการจองให้ครบถ้วน' });
    const { roomId, title, purpose = '', attendeeCount, startAt, endAt, requesterPhone = '', note = '', equipment = [] } = req.body;
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (start >= end) return res.status(422).json({ message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' });
    if (start < new Date()) return res.status(422).json({ message: 'ไม่สามารถจองย้อนหลังได้' });
    const rule = await getRule(req.user.role);
    if (hoursBetween(startAt, endAt) > Number(rule.max_hours)) return res.status(422).json({ message: 'สิทธิ์ของคุณจองได้สูงสุด ' + rule.max_hours + ' ชั่วโมง' });
    const advanceLimit = new Date();
    advanceLimit.setDate(advanceLimit.getDate() + Number(rule.advance_days));
    if (start > advanceLimit) return res.status(422).json({ message: 'สิทธิ์ของคุณจองล่วงหน้าได้ไม่เกิน ' + rule.advance_days + ' วัน' });
    const startTime = startAt.slice(11, 19);
    const endTime = endAt.slice(11, 19);
    if (!rule.allow_outside_hours && (startTime < rule.work_start || endTime > rule.work_end)) return res.status(422).json({ message: 'ช่วงเวลานี้อยู่นอกเวลาทำการ' });
    const [roomRows] = await pool.execute('SELECT capacity, status FROM rooms WHERE id = ?', [roomId]);
    const room = roomRows[0];
    if (!room || room.status !== 'available') return res.status(422).json({ message: 'ห้องนี้ยังไม่พร้อมใช้งาน' });
    if (Number(attendeeCount) > room.capacity) return res.status(422).json({ message: 'จำนวนผู้เข้าร่วมเกินความจุห้อง' });
    if (await hasConflict(roomId, startAt, endAt)) return res.status(409).json({ message: 'ช่วงเวลานี้มีการจองแล้ว' });
    await connection.beginTransaction();
    const [result] = await connection.execute('INSERT INTO bookings (room_id, user_id, title, purpose, attendee_count, start_at, end_at, requester_phone, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [roomId, req.user.id, title, purpose, attendeeCount, startAt, endAt, requesterPhone, note]);
    for (const item of equipment) {
      if (item.id && item.quantity) await connection.execute('INSERT INTO booking_equipment (booking_id, equipment_id, quantity) VALUES (?, ?, ?)', [result.insertId, item.id, item.quantity]);
    }
    await connection.commit();
    await audit(req.user.id, 'create_booking', 'booking', result.insertId, { title, roomId, startAt, endAt });
    await notify({ roleTarget: 'admin', title: 'มีคำขอจองใหม่', message: title, link: '/bookings' });
    await notify({ roleTarget: 'staff', title: 'มีคำขอจองใหม่', message: title, link: '/bookings' });
    res.status(201).json({ id: result.insertId, message: 'ส่งคำขอจองห้องเรียบร้อย' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
});

router.patch('/:id/status', requireAuth, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!allowedStatuses.includes(status)) return res.status(422).json({ message: 'สถานะไม่ถูกต้อง' });
    const [[booking]] = await pool.execute('SELECT user_id, title FROM bookings WHERE id = ?', [req.params.id]);
    const extra = status === 'approved' ? ', approved_by = ?, approved_at = NOW()' : status === 'checked_in' ? ', checked_in_at = NOW()' : status === 'completed' ? ', completed_at = NOW()' : '';
    const params = status === 'approved' ? [status, req.user.id, req.params.id] : [status, req.params.id];
    await pool.execute('UPDATE bookings SET status = ?' + extra + ' WHERE id = ?', params);
    await audit(req.user.id, 'update_booking_status', 'booking', req.params.id, { status });
    if (booking) await notify({ userId: booking.user_id, title: 'อัปเดตสถานะการจอง', message: booking.title + ' : ' + status, link: '/bookings' });
    res.json({ message: 'อัปเดตสถานะเรียบร้อย' });
  } catch (error) { next(error); }
});

router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const [result] = await pool.execute('UPDATE bookings SET status = ? WHERE id = ? AND (user_id = ? OR ? IN ("admin", "staff"))', ['cancelled', req.params.id, req.user.id, req.user.role]);
    if (!result.affectedRows) return res.status(404).json({ message: 'ไม่พบรายการจองที่ยกเลิกได้' });
    await audit(req.user.id, 'cancel_booking', 'booking', req.params.id, {});
    res.json({ message: 'ยกเลิกการจองเรียบร้อย' });
  } catch (error) { next(error); }
});

export default router;
