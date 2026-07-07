
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [[user]] = await pool.execute('SELECT id, name, email, role, status, department, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (error) { next(error); }
});

router.patch('/', async (req, res, next) => {
  try {
    const { name, department = '', phone = '' } = req.body;
    await pool.execute('UPDATE users SET name = ?, department = ?, phone = ? WHERE id = ?', [name, department, phone, req.user.id]);
    res.json({ message: 'Profile updated' });
  } catch (error) { next(error); }
});

router.patch('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(422).json({ message: 'New password must be at least 6 characters' });
    const [[user]] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const ok = user && (user.password_hash === currentPassword || await bcrypt.compare(currentPassword, user.password_hash));
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (error) { next(error); }
});

export default router;
