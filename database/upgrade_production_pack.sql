
USE meetplanning;

CREATE TABLE IF NOT EXISTS app_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(160) NOT NULL,
  ip_address VARCHAR(80),
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login_email_time (email, created_at)
);

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

CREATE TABLE IF NOT EXISTS recurring_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  room_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  purpose TEXT,
  attendee_count INT NOT NULL,
  requester_phone VARCHAR(60),
  note TEXT,
  repeat_type ENUM('weekly','monthly') NOT NULL DEFAULT 'weekly',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('active','paused','ended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS waitlist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  attendee_count INT NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status ENUM('waiting','notified','converted','cancelled') NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_waitlist_room_time (room_id, start_at, end_at)
);

CREATE TABLE IF NOT EXISTS branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO branches (id, name, address)
SELECT 1, 'Main Office', 'Main office'
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE id = 1);

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

CREATE TABLE IF NOT EXISTS room_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(180),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_images_room (room_id)
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status ENUM('active','disabled') NOT NULL DEFAULT 'active' AFTER role,
  ADD COLUMN IF NOT EXISTS force_password_change TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS branch_id INT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS code VARCHAR(40) NULL AFTER name;

UPDATE rooms SET branch_id = 1 WHERE branch_id IS NULL;

INSERT INTO app_settings (setting_key, setting_value) VALUES
('org_name', 'MeetPlanning'),
('primary_color', '#0f766e'),
('admin_email', 'admin@meetplanning.local'),
('smtp_host', ''),
('smtp_port', '587'),
('smtp_user', ''),
('smtp_password', ''),
('smtp_from', 'MeetPlanning <no-reply@meetplanning.local>')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
