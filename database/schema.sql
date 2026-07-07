CREATE DATABASE IF NOT EXISTS meetplanning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE meetplanning;

DROP TABLE IF EXISTS booking_equipment;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS room_equipment;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','staff','user') NOT NULL DEFAULT 'user',
  department VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  building VARCHAR(120) NOT NULL,
  floor VARCHAR(40) NOT NULL,
  capacity INT NOT NULL,
  status ENUM('available','maintenance','disabled') NOT NULL DEFAULT 'available',
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(80) DEFAULT 'Package'
);

CREATE TABLE room_equipment (
  room_id INT NOT NULL,
  equipment_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (room_id, equipment_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  purpose TEXT,
  attendee_count INT NOT NULL,
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  requester_phone VARCHAR(60),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_bookings_room_time (room_id, start_at, end_at),
  INDEX idx_bookings_status (status)
);

CREATE TABLE booking_equipment (
  booking_id INT NOT NULL,
  equipment_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (booking_id, equipment_id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);

INSERT INTO users (name, email, password_hash, role, department) VALUES
('ผู้ดูแลระบบ', 'admin@meetplanning.local', '$2a$10$JBOR8PPl2DsrKvOUrLjs1.9r/UjXE0KASAVDYw4e6xIWBjQJcnGly', 'admin', 'IT'),
('ผู้ใช้งานตัวอย่าง', 'user@meetplanning.local', '$2a$10$RjwYcxfwRnGPrVFEMMEjAOCIXHLfgA8mJyG5.x6EqpTpmsWtqqWH6', 'user', 'Operations');

INSERT INTO rooms (name, building, floor, capacity, status, description, image_url) VALUES
('Orchid Room', 'อาคาร A', 'ชั้น 2', 12, 'available', 'ห้องประชุมขนาดเล็กสำหรับทีมโปรเจกต์', 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=900&q=80'),
('Siam Hall', 'อาคาร A', 'ชั้น 5', 60, 'available', 'ห้องสัมมนาพร้อมระบบเสียงและโปรเจกเตอร์', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80'),
('River View', 'อาคาร B', 'ชั้น 10', 24, 'available', 'ห้องวิวเมือง เหมาะกับประชุมผู้บริหารและลูกค้า', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80'),
('Focus Pod', 'อาคาร C', 'ชั้น 1', 6, 'maintenance', 'ห้องเล็กสำหรับสัมภาษณ์หรือประชุมเฉพาะกิจ', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80');

INSERT INTO equipment (name, icon) VALUES
('Projector', 'Projector'), ('Video Conference', 'Video'), ('Whiteboard', 'PenTool'), ('Sound System', 'Volume2'), ('Catering Table', 'Coffee');

INSERT INTO room_equipment (room_id, equipment_id, quantity) VALUES
(1,1,1),(1,2,1),(1,3,1),(2,1,2),(2,4,1),(2,5,2),(3,2,1),(3,3,2),(3,4,1),(4,3,1);

INSERT INTO bookings (room_id, user_id, title, purpose, attendee_count, start_at, end_at, status, requester_phone, note) VALUES
(1, 2, 'Weekly Planning', 'วางแผนงานประจำสัปดาห์', 8, DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 9 HOUR, DATE_ADD(CURDATE(), INTERVAL 1 DAY) + INTERVAL 10 HOUR, 'approved', '080-000-0000', 'ต้องการเปิดระบบ conference'),
(3, 2, 'Client Review', 'นำเสนอความคืบหน้าให้ลูกค้า', 18, DATE_ADD(CURDATE(), INTERVAL 2 DAY) + INTERVAL 14 HOUR, DATE_ADD(CURDATE(), INTERVAL 2 DAY) + INTERVAL 16 HOUR, 'pending', '080-111-1111', NULL);

