
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? OR role_target = ? OR role_target = "all" ORDER BY created_at DESC LIMIT 80',
      [req.user.id, req.user.role]
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR role_target = ? OR role_target = "all")',
      [req.params.id, req.user.id, req.user.role]
    );
    res.json({ message: 'Notification read' });
  } catch (error) { next(error); }
});

export default router;
