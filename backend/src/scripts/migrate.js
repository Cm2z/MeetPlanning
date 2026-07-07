
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', '..', '..');

const upgradeFiles = [
  'database/upgrade_enterprise.sql',
  'database/upgrade_pro_features.sql',
  'database/upgrade_production_pack.sql',
  'database/fix_backend_required_tables.sql'
];

async function tableExists(name) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [name]
  );
  return Number(rows[0].total) > 0;
}

async function runSqlFile(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    console.log('skip missing', relativePath);
    return;
  }
  const sql = fs.readFileSync(file, 'utf8');
  if (!sql.trim()) return;
  console.log('running', relativePath);
  await pool.query(sql);
}

async function main() {
  if (!(await tableExists('users'))) {
    await runSqlFile('database/schema.sql');
  }

  for (const file of upgradeFiles) {
    await runSqlFile(file);
  }

  console.log('Migration completed');
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
