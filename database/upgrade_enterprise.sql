
USE meetplanning;

CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO branches (id, name, address)
SELECT 1, 'สำนักงานใหญ่', 'Main office'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 1);

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS branch_id INT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS code VARCHAR(40) NULL AFTER name;

UPDATE rooms SET branch_id = 1 WHERE branch_id IS NULL;

ALTER TABLE rooms
  ADD CONSTRAINT fk_rooms_branch FOREIGN KEY (branch_id) REFERENCES branches(id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(60) NULL AFTER department,
  ADD COLUMN IF NOT EXISTS status ENUM('active','disabled') NOT NULL DEFAULT 'active' AFTER role;

ALTER TABLE equipment
  ADD COLUMN IF NOT EXISTS total_quantity INT NOT NULL DEFAULT 1 AFTER icon,
  ADD COLUMN IF NOT EXISTS status ENUM('available','maintenance','disabled') NOT NULL DEFAULT 'available' AFTER total_quantity;

ALTER TABLE bookings
  MODIFY status ENUM('draft','pending','approved','rejected','cancelled','checked_in','completed','no_show') NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL AFTER approved_by,
  ADD COLUMN IF NOT EXISTS checked_in_at DATETIME NULL AFTER approved_at,
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL AFTER checked_in_at;

UPDATE bookings SET status = 'pending' WHERE status = 'draft';
UPDATE bookings SET status = 'approved' WHERE status NOT IN ('pending','approved','rejected','cancelled','checked_in','completed','no_show');
