
import { pool } from '../config/db.js';

async function settingsMap() {
  try {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM app_settings');
    return Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value || '']));
  } catch {
    return {};
  }
}

export async function sendMail({ to, subject, text }) {
  const settings = await settingsMap();
  if (!settings.smtp_host || !to) return { skipped: true, reason: 'SMTP is not configured' };

  let nodemailer;
  try {
    nodemailer = await import('nodemailer');
  } catch {
    return { skipped: true, reason: 'nodemailer is not installed' };
  }

  const transporter = nodemailer.default.createTransport({
    host: settings.smtp_host,
    port: Number(settings.smtp_port || 587),
    secure: Number(settings.smtp_port) === 465,
    auth: settings.smtp_user ? { user: settings.smtp_user, pass: settings.smtp_password || '' } : undefined
  });

  await transporter.sendMail({
    from: settings.smtp_from || 'MeetPlanning <no-reply@meetplanning.local>',
    to,
    subject,
    text
  });

  return { sent: true };
}
