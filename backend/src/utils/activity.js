
import { pool } from '../config/db.js';
import { sendMail } from './mailer.js';

export async function audit(actorId, action, entityType, entityId, detail = '') {
  await pool.execute(
    'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
    [actorId || null, action, entityType, entityId || null, typeof detail === 'string' ? detail : JSON.stringify(detail)]
  );
}

export async function notify({ userId = null, roleTarget = null, title, message = '', link = '', email = '' }) {
  await pool.execute(
    'INSERT INTO notifications (user_id, role_target, title, message, link) VALUES (?, ?, ?, ?, ?)',
    [userId, roleTarget, title, message, link]
  );
  if (email) {
    try { await sendMail({ to: email, subject: title, text: message }); } catch (error) { console.warn('Mail skipped:', error.message); }
  }
}
