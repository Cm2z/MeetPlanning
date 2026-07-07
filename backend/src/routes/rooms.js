
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../utils/activity.js';

const router = Router();

async function withEquipment(room) {
  const [equipment] = await pool.execute('SELECT e.id, e.name, e.icon, re.quantity FROM room_equipment re JOIN equipment e ON e.id = re.equipment_id WHERE re.room_id = ? ORDER BY e.name', [room.id]);
  const [images] = await pool.execute('SELECT id, image_url, caption, sort_order FROM room_images WHERE room_id = ? ORDER BY sort_order, id', [room.id]);
  return { ...room, equipment, images };
}

router.get('/meta', async (_req, res, next) => {
  try {
    const [branches] = await pool.execute('SELECT * FROM branches ORDER BY name');
    const [buildings] = await pool.execute('SELECT DISTINCT building FROM rooms ORDER BY building');
    const [equipment] = await pool.execute('SELECT * FROM equipment ORDER BY name');
    res.json({ branches, buildings: buildings.map((row) => row.building), equipment });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const { date, start, end, capacity = 1, branchId = '', building = '', equipment = '', status = 'available', q = '' } = req.query;
    const params = [Number(capacity) || 1];
    let where = 'r.capacity >= ?';
    if (status) { where += ' AND r.status = ?'; params.push(status); }
    if (branchId) { where += ' AND r.branch_id = ?'; params.push(branchId); }
    if (building) { where += ' AND r.building = ?'; params.push(building); }
    if (q) { where += ' AND (r.name LIKE ? OR r.code LIKE ? OR r.description LIKE ?)'; params.push('%' + q + '%', '%' + q + '%', '%' + q + '%'); }
    if (date && start && end) {
      where += " AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND b.status IN ('pending','approved','checked_in') AND TIMESTAMP(?, ?) < b.end_at AND TIMESTAMP(?, ?) > b.start_at)";
      params.push(date, start, date, end);
    }
    const equipmentIds = String(equipment).split(',').filter(Boolean).map(Number);
    if (equipmentIds.length) {
      where += ' AND r.id IN (SELECT room_id FROM room_equipment WHERE equipment_id IN (' + equipmentIds.map(() => '?').join(',') + ') GROUP BY room_id HAVING COUNT(DISTINCT equipment_id) = ?)';
      params.push(...equipmentIds, equipmentIds.length);
    }
    const [rooms] = await pool.execute('SELECT r.*, br.name AS branch_name FROM rooms r LEFT JOIN branches br ON br.id = r.branch_id WHERE ' + where + ' ORDER BY br.name, r.building, r.capacity, r.name', params);
    res.json(await Promise.all(rooms.map(withEquipment)));
  } catch (error) { next(error); }
});

router.post('/', requireAuth, requireRole('admin', 'staff'),
  body('name').notEmpty(), body('building').notEmpty(), body('floor').notEmpty(), body('capacity').isInt({ min: 1 }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(422).json({ message: 'Room data is incomplete' });
      const { name, code = '', branchId = 1, building, floor, capacity, status = 'available', description = '', imageUrl = '', equipment = [], images = [] } = req.body;
      const [result] = await pool.execute('INSERT INTO rooms (branch_id, code, name, building, floor, capacity, status, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [branchId, code, name, building, floor, capacity, status, description, imageUrl]);
      for (const item of equipment) if (item.id && item.quantity) await pool.execute('INSERT INTO room_equipment (room_id, equipment_id, quantity) VALUES (?, ?, ?)', [result.insertId, item.id, item.quantity]);
      for (const image of images) if (image.imageUrl) await pool.execute('INSERT INTO room_images (room_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)', [result.insertId, image.imageUrl, image.caption || '', image.sortOrder || 0]);
      await audit(req.user.id, 'create_room', 'room', result.insertId, { name });
      res.status(201).json({ id: result.insertId, message: 'Room created' });
    } catch (error) { next(error); }
  }
);

router.patch('/:id', requireAuth, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    const { name, code = '', branchId = 1, building, floor, capacity, status = 'available', description = '', imageUrl = '', equipment = [], images = [] } = req.body;
    await pool.execute('UPDATE rooms SET branch_id = ?, code = ?, name = ?, building = ?, floor = ?, capacity = ?, status = ?, description = ?, image_url = ? WHERE id = ?', [branchId, code, name, building, floor, capacity, status, description, imageUrl, req.params.id]);
    await pool.execute('DELETE FROM room_equipment WHERE room_id = ?', [req.params.id]);
    await pool.execute('DELETE FROM room_images WHERE room_id = ?', [req.params.id]);
    for (const item of equipment) if (item.id && item.quantity) await pool.execute('INSERT INTO room_equipment (room_id, equipment_id, quantity) VALUES (?, ?, ?)', [req.params.id, item.id, item.quantity]);
    for (const image of images) if (image.imageUrl) await pool.execute('INSERT INTO room_images (room_id, image_url, caption, sort_order) VALUES (?, ?, ?, ?)', [req.params.id, image.imageUrl, image.caption || '', image.sortOrder || 0]);
    await audit(req.user.id, 'update_room', 'room', req.params.id, { name });
    res.json({ message: 'Room updated' });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, requireRole('admin', 'staff'), async (req, res, next) => {
  try {
    await pool.execute('UPDATE rooms SET status = "disabled" WHERE id = ?', [req.params.id]);
    await audit(req.user.id, 'disable_room', 'room', req.params.id, {});
    res.json({ message: 'Room disabled' });
  } catch (error) { next(error); }
});

export default router;
