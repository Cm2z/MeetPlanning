
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { audit, notify } from '../utils/activity.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT w.*, r.name AS room_name, u.name AS requester_name FROM waitlist w JOIN rooms r ON r.id=w.room_id JOIN users u ON u.id=w.user_id WHERE w.user_id = ? OR ? IN ("admin","staff") ORDER BY w.created_at DESC', [req.user.id, req.user.role]);
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { roomId, title, attendeeCount, startAt, endAt } = req.body;
    const [result] = await pool.execute('INSERT INTO waitlist (room_id, user_id, title, attendee_count, start_at, end_at) VALUES (?, ?, ?, ?, ?, ?)', [roomId, req.user.id, title, attendeeCount, startAt, endAt]);
    await audit(req.user.id, 'join_waitlist', 'waitlist', result.insertId, { roomId, startAt, endAt });
    await notify({ roleTarget: 'admin', title: 'มีรายการ waitlist ใหม่', message: title, link: '/waitlist' });
    res.status(201).json({ id: result.insertId, message: 'Added to waitlist' });
  } catch (error) { next(error); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    if (!['waiting','notified','converted','cancelled'].includes(req.body.status)) return res.status(422).json({ message: 'Invalid status' });
    await pool.execute('UPDATE waitlist SET status = ? WHERE id = ? AND (user_id = ? OR ? IN ("admin","staff"))', [req.body.status, req.params.id, req.user.id, req.user.role]);
    await audit(req.user.id, 'update_waitlist', 'waitlist', req.params.id, { status: req.body.status });
    res.json({ message: 'Waitlist updated' });
  } catch (error) { next(error); }
});

export default router;
