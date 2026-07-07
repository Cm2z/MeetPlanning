
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { audit, notify } from '../utils/activity.js';

const router = Router();
router.use(requireAuth);

function combine(date, time) { return date + 'T' + time; }
function addStep(date, type) {
  const next = new Date(date);
  if (type === 'monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return next;
}
function ymd(date) { return date.toISOString().slice(0, 10); }

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT rb.*, r.name AS room_name FROM recurring_bookings rb JOIN rooms r ON r.id=rb.room_id WHERE rb.user_id = ? OR ? IN ("admin","staff") ORDER BY rb.created_at DESC', [req.user.id, req.user.role]);
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const { roomId, title, purpose = '', attendeeCount, requesterPhone = '', note = '', repeatType = 'weekly', startDate, endDate, startTime, endTime } = req.body;
    if (!roomId || !title || !startDate || !endDate || !startTime || !endTime) return res.status(422).json({ message: 'Recurring data is incomplete' });
    await connection.beginTransaction();
    const [series] = await connection.execute('INSERT INTO recurring_bookings (user_id, room_id, title, purpose, attendee_count, requester_phone, note, repeat_type, start_date, end_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [req.user.id, roomId, title, purpose, attendeeCount, requesterPhone, note, repeatType, startDate, endDate, startTime, endTime]);
    let date = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    let created = 0;
    while (date <= end && created < 60) {
      const day = ymd(date);
      const startAt = combine(day, startTime);
      const endAt = combine(day, endTime);
      const [conflicts] = await connection.execute('SELECT id FROM bookings WHERE room_id = ? AND status IN ("pending","approved","checked_in") AND ? < end_at AND ? > start_at LIMIT 1', [roomId, startAt, endAt]);
      if (!conflicts.length) {
        await connection.execute('INSERT INTO bookings (room_id, user_id, title, purpose, attendee_count, start_at, end_at, requester_phone, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [roomId, req.user.id, title, purpose, attendeeCount, startAt, endAt, requesterPhone, note]);
        created += 1;
      }
      date = addStep(date, repeatType);
    }
    await connection.commit();
    await audit(req.user.id, 'create_recurring_booking', 'recurring_booking', series.insertId, { created });
    await notify({ roleTarget: 'admin', title: 'มีการจองซ้ำใหม่', message: title, link: '/bookings' });
    res.status(201).json({ id: series.insertId, created, message: 'Recurring booking created' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
});

export default router;
