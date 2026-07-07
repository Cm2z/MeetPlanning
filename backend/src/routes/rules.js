
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../utils/activity.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM booking_rules ORDER BY FIELD(role, "admin", "staff", "user")');
    res.json(rows);
  } catch (error) { next(error); }
});

router.patch('/:role', async (req, res, next) => {
  try {
    const { maxHours, advanceDays, allowOutsideHours, workStart, workEnd } = req.body;
    await pool.execute(
      'UPDATE booking_rules SET max_hours = ?, advance_days = ?, allow_outside_hours = ?, work_start = ?, work_end = ? WHERE role = ?',
      [maxHours, advanceDays, allowOutsideHours ? 1 : 0, workStart, workEnd, req.params.role]
    );
    await audit(req.user.id, 'update_rule', 'booking_rule', null, { role: req.params.role });
    res.json({ message: 'Rule updated' });
  } catch (error) { next(error); }
});

export default router;
