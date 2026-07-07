
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

router.get('/', async (req, res, next) => {
  try {
    const params = [];
    let where = '1=1';
    if (req.query.action) { where += ' AND a.action = ?'; params.push(req.query.action); }
    if (req.query.entityType) { where += ' AND a.entity_type = ?'; params.push(req.query.entityType); }
    if (req.query.from) { where += ' AND a.created_at >= ?'; params.push(req.query.from); }
    if (req.query.to) { where += ' AND a.created_at <= ?'; params.push(req.query.to); }
    const [rows] = await pool.execute(
      'SELECT a.*, u.name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id WHERE ' + where + ' ORDER BY a.created_at DESC LIMIT 300',
      params
    );
    res.json(rows);
  } catch (error) { next(error); }
});

export default router;
