
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../utils/activity.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();

router.get('/public', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ("org_name","primary_color")');
    res.json(Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value])));
  } catch (error) { next(error); }
});

router.get('/', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM app_settings ORDER BY setting_key');
    res.json(Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value])));
  } catch (error) { next(error); }
});

router.patch('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await pool.execute('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', [key, String(value ?? '')]);
    }
    await audit(req.user.id, 'update_settings', 'settings', null, Object.keys(req.body));
    res.json({ message: 'Settings updated' });
  } catch (error) { next(error); }
});

router.post('/test-email', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await sendMail({ to: req.body.to, subject: 'MeetPlanning test email', text: 'SMTP is working.' });
    res.json(result);
  } catch (error) { next(error); }
});

export default router;
