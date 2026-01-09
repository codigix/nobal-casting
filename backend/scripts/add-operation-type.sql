-- Add operation_type column to operation table
ALTER TABLE operation ADD COLUMN IF NOT EXISTS operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE';
ALTER TABLE operation ADD INDEX IF NOT EXISTS idx_operation_type (operation_type);

-- Create bom_operation table if it doesn't exist
CREATE TABLE IF NOT EXISTS bom_operation (
  operation_id INT AUTO_INCREMENT PRIMARY KEY,
  bom_id VARCHAR(50) NOT NULL,
  operation_name VARCHAR(255),
  workstation_type VARCHAR(100),
  operation_time DECIMAL(10,2),
  fixed_time DECIMAL(10,2),
  operating_cost DECIMAL(12,4),
  operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE',
  sequence INT,
  notes LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
  INDEX idx_bom_id (bom_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_sequence (sequence)
);

-- Add operation_type column to bom_operation if table already exists without this column
ALTER TABLE bom_operation ADD COLUMN IF NOT EXISTS operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE';
ALTER TABLE bom_operation ADD INDEX IF NOT EXISTS idx_operation_type (operation_type);
