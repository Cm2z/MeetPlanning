
import { Router } from 'express';
import { pool } from '../config/db.js';

const router = Router();

router.get('/room/:id', async (req, res, next) => {
  try {
    const [[room]] = await pool.execute('SELECT r.*, br.name AS branch_name FROM rooms r LEFT JOIN branches br ON br.id=r.branch_id WHERE r.id = ?', [req.params.id]);
    const [bookings] = await pool.execute('SELECT b.*, u.name AS requester_name FROM bookings b JOIN users u ON u.id=b.user_id WHERE b.room_id = ? AND DATE(b.start_at) = CURDATE() AND b.status IN ("pending","approved","checked_in") ORDER BY b.start_at', [req.params.id]);
    const now = new Date();
    const current = bookings.find((b) => new Date(b.start_at) <= now && new Date(b.end_at) >= now) || null;
    const next = bookings.find((b) => new Date(b.start_at) > now) || null;
    res.json({ room, current, next, bookings });
  } catch (error) { next(error); }
});

export default router;
