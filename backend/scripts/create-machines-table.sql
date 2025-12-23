-- Create Production Machines Table
CREATE TABLE IF NOT EXISTS production_machines (
  machine_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  status ENUM('Operational', 'Maintenance', 'Down') DEFAULT 'Operational',
  capacity INT DEFAULT 100,
  workload INT DEFAULT 0,
  allocation INT DEFAULT 0,
  performance INT DEFAULT 0,
  errors INT DEFAULT 0,
  last_maintenance TIMESTAMP,
  total_operating_hours INT DEFAULT 0,
  maintenance_cycles INT DEFAULT 0,
  uptime_percentage DECIMAL(5, 2) DEFAULT 99.2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_name (name),
  INDEX idx_created_at (created_at)
);

-- Insert sample machines data
INSERT INTO production_machines (machine_id, name, type, status, capacity, workload, allocation, performance, errors, last_maintenance, total_operating_hours, maintenance_cycles, uptime_percentage) VALUES
('M-001', 'CNC Lathe 1', 'CNC Lathe', 'Operational', 100, 85, 90, 87, 0, NOW(), 8432, 24, 99.2),
('M-002', 'Milling Machine', 'Milling Machine', 'Operational', 100, 72, 75, 74, 2, DATE_SUB(NOW(), INTERVAL 8 MONTH), 7654, 22, 98.8),
('M-003', 'Stamping Press', 'Stamping Press', 'Operational', 100, 95, 100, 96, 0, NOW(), 9123, 26, 99.5),
('M-004', 'Assembly Robot', 'Robotic Arm', 'Maintenance', 100, 0, 20, 15, 1, DATE_SUB(NOW(), INTERVAL 2 WEEK), 6234, 18, 97.5),
('M-005', 'Polishing Unit', 'Polishing Machine', 'Operational', 100, 88, 85, 89, 1, DATE_SUB(NOW(), INTERVAL 7 MONTH), 8876, 25, 99.0),
('M-006', 'Packaging Machine', 'Packaging Machine', 'Down', 100, 0, 0, 10, 3, DATE_SUB(NOW(), INTERVAL 8 MONTH), 5432, 15, 96.2);
