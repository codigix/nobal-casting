-- Create BOM (Bill of Materials) table
CREATE TABLE IF NOT EXISTS bom (
  bom_id VARCHAR(50) PRIMARY KEY,
  item_code VARCHAR(100) NOT NULL,
  description TEXT,
  quantity DECIMAL(18,6) DEFAULT 1,
  uom VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Draft',
  revision INT DEFAULT 1,
  effective_date DATE,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  INDEX idx_status (status),
  INDEX idx_item_code (item_code)
);

-- Create BOM Line Items table
CREATE TABLE IF NOT EXISTS bom_line (
  line_id INT AUTO_INCREMENT PRIMARY KEY,
  bom_id VARCHAR(50) NOT NULL,
  component_code VARCHAR(100) NOT NULL,
  quantity DECIMAL(18,6) NOT NULL,
  uom VARCHAR(50),
  component_description TEXT,
  component_type VARCHAR(50),
  sequence INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
  FOREIGN KEY (component_code) REFERENCES item(item_code),
  INDEX idx_bom_id (bom_id),
  INDEX idx_sequence (sequence)
);

-- Create Job Card table
CREATE TABLE IF NOT EXISTS job_card (
  job_card_id VARCHAR(50) PRIMARY KEY,
  work_order_id VARCHAR(50),
  machine_id VARCHAR(100),
  operator_id VARCHAR(100),
  planned_quantity DECIMAL(18,6),
  produced_quantity DECIMAL(18,6) DEFAULT 0,
  rejected_quantity DECIMAL(18,6) DEFAULT 0,
  scheduled_start_date DATETIME,
  scheduled_end_date DATETIME,
  actual_start_date DATETIME,
  actual_end_date DATETIME,
  status VARCHAR(50) DEFAULT 'Open',
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_work_order_id (work_order_id),
  INDEX idx_machine_id (machine_id),
  INDEX idx_operator_id (operator_id)
);

-- Add indexes for better query performance
ALTER TABLE bom ADD INDEX idx_created_at (created_at);
ALTER TABLE bom_line ADD INDEX idx_component_code (component_code);
ALTER TABLE job_card ADD INDEX idx_created_at (created_at);
