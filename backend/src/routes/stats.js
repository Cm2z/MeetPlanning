
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

router.get('/', async (_req, res, next) => {
  try {
    const [monthly] = await pool.execute('SELECT DATE_FORMAT(start_at, "%Y-%m") AS month, COUNT(*) AS total FROM bookings GROUP BY month ORDER BY month DESC LIMIT 12');
    const [hours] = await pool.execute('SELECT HOUR(start_at) AS hour, COUNT(*) AS total FROM bookings GROUP BY hour ORDER BY hour');
    const [rooms] = await pool.execute('SELECT r.name, COUNT(*) AS total FROM bookings b JOIN rooms r ON r.id=b.room_id GROUP BY r.id, r.name ORDER BY total DESC LIMIT 8');
    const [cancelRate] = await pool.execute('SELECT status, COUNT(*) AS total FROM bookings GROUP BY status');
    res.json({ monthly, hours, rooms, cancelRate });
  } catch (error) { next(error); }
});

export default router;
