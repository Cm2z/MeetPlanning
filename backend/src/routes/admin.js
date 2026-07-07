
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('admin', 'staff'));

router.get('/branches', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM branches ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/branches', body('name').notEmpty(), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: 'Branch name is required' });
    const [result] = await pool.execute('INSERT INTO branches (name, address) VALUES (?, ?)', [req.body.name, req.body.address || '']);
    res.status(201).json({ id: result.insertId, message: 'Branch created' });
  } catch (error) { next(error); }
});

router.get('/users', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, email, role, status, department, phone, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) { next(error); }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { role, status, department = '', phone = '' } = req.body;
    if (!['admin','staff','user'].includes(role)) return res.status(422).json({ message: 'Invalid role' });
    if (!['active','disabled'].includes(status)) return res.status(422).json({ message: 'Invalid status' });
    await pool.execute('UPDATE users SET role = ?, status = ?, department = ?, phone = ? WHERE id = ?', [role, status, department, phone, req.params.id]);
    res.json({ message: 'User updated' });
  } catch (error) { next(error); }
});

router.get('/equipment', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM equipment ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
});

router.post('/equipment', body('name').notEmpty(), async (req, res, next) => {
  try {
    const { name, icon = 'Package', totalQuantity = 1, status = 'available' } = req.body;
    const [result] = await pool.execute('INSERT INTO equipment (name, icon, total_quantity, status) VALUES (?, ?, ?, ?)', [name, icon, totalQuantity, status]);
    res.status(201).json({ id: result.insertId, message: 'Equipment created' });
  } catch (error) { next(error); }
});

router.patch('/equipment/:id', async (req, res, next) => {
  try {
    const { name, icon = 'Package', totalQuantity = 1, status = 'available' } = req.body;
    await pool.execute('UPDATE equipment SET name = ?, icon = ?, total_quantity = ?, status = ? WHERE id = ?', [name, icon, totalQuantity, status, req.params.id]);
    res.json({ message: 'Equipment updated' });
  } catch (error) { next(error); }
});

router.delete('/equipment/:id', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM equipment WHERE id = ?', [req.params.id]);
    res.json({ message: 'Equipment deleted' });
  } catch (error) { next(error); }
});

export default router;
