
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../utils/activity.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

function csvEscape(value) {
  const text = String(value ?? '');
  return '"' + text.replace(/"/g, '""') + '"';
}

router.get('/summary', async (req, res, next) => {
  try {
    const params = [];
    let where = '1=1';
    if (req.query.from) { where += ' AND b.start_at >= ?'; params.push(req.query.from); }
    if (req.query.to) { where += ' AND b.start_at <= ?'; params.push(req.query.to); }
    if (req.query.branchId) { where += ' AND r.branch_id = ?'; params.push(req.query.branchId); }
    if (req.query.roomId) { where += ' AND r.id = ?'; params.push(req.query.roomId); }
    const [byStatus] = await pool.execute('SELECT b.status, COUNT(*) AS total FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE ' + where + ' GROUP BY b.status', params);
    const [topRooms] = await pool.execute('SELECT r.name AS room_name, COUNT(*) AS total FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE ' + where + ' GROUP BY r.id, r.name ORDER BY total DESC LIMIT 10', params);
    const [topUsers] = await pool.execute('SELECT u.name AS requester_name, COUNT(*) AS total FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN users u ON u.id = b.user_id WHERE ' + where + ' GROUP BY u.id, u.name ORDER BY total DESC LIMIT 10', params);
    res.json({ byStatus, topRooms, topUsers });
  } catch (error) { next(error); }
});

router.get('/bookings.csv', async (req, res, next) => {
  try {
    const params = [];
    let where = '1=1';
    if (req.query.from) { where += ' AND b.start_at >= ?'; params.push(req.query.from); }
    if (req.query.to) { where += ' AND b.start_at <= ?'; params.push(req.query.to); }
    if (req.query.status) { where += ' AND b.status = ?'; params.push(req.query.status); }
    if (req.query.branchId) { where += ' AND r.branch_id = ?'; params.push(req.query.branchId); }
    const [rows] = await pool.execute(
      'SELECT b.id, b.title, b.status, b.attendee_count, b.start_at, b.end_at, r.name AS room_name, r.building, br.name AS branch_name, u.name AS requester_name FROM bookings b JOIN rooms r ON r.id=b.room_id LEFT JOIN branches br ON br.id=r.branch_id JOIN users u ON u.id=b.user_id WHERE ' + where + ' ORDER BY b.start_at DESC',
      params
    );
    const header = ['id','title','status','attendee_count','start_at','end_at','room_name','building','branch_name','requester_name'];
    const body = rows.map((row) => header.map((key) => csvEscape(row[key])).join(',')).join('\n');
    await audit(req.user.id, 'export_report', 'bookings', null, req.query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="meetplanning-bookings.csv"');
    res.send('\uFEFF' + header.join(',') + '\n' + body);
  } catch (error) { next(error); }
});

export default router;
