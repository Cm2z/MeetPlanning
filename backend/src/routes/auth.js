
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db.js';
import { audit } from '../utils/activity.js';

const router = Router();

function signUser(user) {
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, forcePasswordChange: !!user.force_password_change };
  return { token: jwt.sign(safeUser, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' }), user: safeUser };
}

async function isLocked(email) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS failed FROM login_attempts WHERE email = ? AND success = 0 AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)',
    [email]
  );
  return Number(rows[0].failed) >= 5;
}

router.post('/login', body('email').isEmail(), body('password').isLength({ min: 6 }), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: 'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง' });
    const { email, password } = req.body;
    if (await isLocked(email)) return res.status(429).json({ message: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 10 นาที' });
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND status = "active"', [email]);
    const user = rows[0];
    const passwordOk = user && (await bcrypt.compare(password, user.password_hash).catch(() => false) || user.password_hash === password);
    await pool.execute('INSERT INTO login_attempts (email, ip_address, success) VALUES (?, ?, ?)', [email, req.ip, passwordOk ? 1 : 0]);
    if (!passwordOk) return res.status(401).json({ message: 'Email or password is incorrect' });
    if (user.password_hash === password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.execute('UPDATE users SET password_hash = ?, force_password_change = 1 WHERE id = ?', [hash, user.id]);
      user.force_password_change = 1;
    }
    await audit(user.id, 'login', 'user', user.id, {});
    res.json(signUser(user));
  } catch (error) { next(error); }
});

router.post('/register', body('name').trim().isLength({ min: 2 }), body('email').isEmail(), body('password').isLength({ min: 6 }), async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: 'กรุณากรอกชื่อ อีเมล และรหัสผ่านอย่างน้อย 6 ตัวอักษร' });
    const { name, email, password, department = '' } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute('INSERT INTO users (name, email, password_hash, role, status, department) VALUES (?, ?, ?, ?, ?, ?)', [name, email, passwordHash, 'user', 'active', department]);
    await audit(result.insertId, 'register', 'user', result.insertId, {});
    res.status(201).json(signUser({ id: result.insertId, name, email, role: 'user', status: 'active', department, force_password_change: 0 }));
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'อีเมลนี้มีบัญชีอยู่แล้ว' });
    next(error);
  }
});

export default router;
