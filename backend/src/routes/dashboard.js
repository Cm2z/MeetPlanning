import { Router } from 'express';
import { pool } from '../config/db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [[roomCount]] = await pool.execute('SELECT COUNT(*) AS total FROM rooms WHERE status = "available"');
    const [[pendingCount]] = await pool.execute('SELECT COUNT(*) AS total FROM bookings WHERE status = "pending"');
    const [[todayCount]] = await pool.execute('SELECT COUNT(*) AS total FROM bookings WHERE DATE(start_at) = CURDATE() AND status IN ("pending", "approved")');
    const [upcoming] = await pool.execute('SELECT b.id, b.title, b.start_at, b.end_at, b.status, r.name AS room_name, u.name AS requester_name FROM bookings b JOIN rooms r ON r.id=b.room_id JOIN users u ON u.id=b.user_id WHERE b.start_at >= NOW() AND b.status IN ("pending","approved") ORDER BY b.start_at LIMIT 8');
    res.json({ roomCount: roomCount.total, pendingCount: pendingCount.total, todayCount: todayCount.total, upcoming });
  } catch (error) {
    next(error);
  }
});

export default router;
