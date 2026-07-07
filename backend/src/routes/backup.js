
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../utils/activity.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

function esc(value) {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return "'" + value.toISOString().slice(0, 19).replace('T', ' ') + "'";
  return "'" + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

router.get('/download', async (req, res, next) => {
  try {
    const [tables] = await pool.execute('SHOW TABLES');
    const tableKey = Object.keys(tables[0] || {})[0];
    let sql = 'CREATE DATABASE IF NOT EXISTS meetplanning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE meetplanning;\n\n';
    for (const row of tables) {
      const table = row[tableKey];
      const [[createRow]] = await pool.execute('SHOW CREATE TABLE ' + table);
      sql += 'DROP TABLE IF EXISTS ' + table + ';\n' + createRow['Create Table'] + ';\n\n';
      const [data] = await pool.execute('SELECT * FROM ' + table);
      for (const item of data) {
        const columns = Object.keys(item).join(',');
        const values = Object.values(item).map(esc).join(',');
        sql += 'INSERT INTO ' + table + ' (' + columns + ') VALUES (' + values + ');\n';
      }
      sql += '\n';
    }
    await audit(req.user.id, 'backup_database', 'database', null, {});
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="meetplanning-backup.sql"');
    res.send(sql);
  } catch (error) { next(error); }
});

router.post('/restore', async (req, res, next) => {
  try {
    if (!req.body.sql || !String(req.body.sql).includes('meetplanning')) return res.status(422).json({ message: 'Invalid SQL backup' });
    await pool.query(req.body.sql);
    await audit(req.user.id, 'restore_database', 'database', null, {});
    res.json({ message: 'Restore completed' });
  } catch (error) { next(error); }
});

export default router;
