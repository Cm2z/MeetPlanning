
USE meetplanning;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  role_target ENUM('admin','staff','user','all') NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT,
  link VARCHAR(255),
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id, is_read),
  INDEX idx_notifications_role (role_target, is_read)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT NULL,
  detail TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_actor (actor_id)
);

CREATE TABLE IF NOT EXISTS booking_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role ENUM('admin','staff','user') NOT NULL UNIQUE,
  max_hours DECIMAL(5,2) NOT NULL DEFAULT 2,
  advance_days INT NOT NULL DEFAULT 30,
  allow_outside_hours TINYINT(1) NOT NULL DEFAULT 0,
  work_start TIME NOT NULL DEFAULT '08:00:00',
  work_end TIME NOT NULL DEFAULT '18:00:00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO booking_rules (role, max_hours, advance_days, allow_outside_hours, work_start, work_end)
VALUES ('user', 2, 30, 0, '08:00:00', '18:00:00')
ON DUPLICATE KEY UPDATE role = role;

INSERT INTO booking_rules (role, max_hours, advance_days, allow_outside_hours, work_start, work_end)
VALUES ('staff', 6, 90, 1, '08:00:00', '20:00:00')
ON DUPLICATE KEY UPDATE role = role;

INSERT INTO booking_rules (role, max_hours, advance_days, allow_outside_hours, work_start, work_end)
VALUES ('admin', 24, 365, 1, '00:00:00', '23:59:00')
ON DUPLICATE KEY UPDATE role = role;

CREATE TABLE IF NOT EXISTS room_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(180),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_room_images_room (room_id)
);

INSERT INTO room_images (room_id, image_url, caption, sort_order)
SELECT id, image_url, 'ภาพหลัก', 1 FROM rooms
WHERE image_url IS NOT NULL
AND image_url <> ''
AND NOT EXISTS (SELECT 1 FROM room_images WHERE room_images.room_id = rooms.id);
