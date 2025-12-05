-- Operations Table for Production Module
CREATE TABLE IF NOT EXISTS operation (
  name VARCHAR(100) PRIMARY KEY,
  operation_name VARCHAR(255) NOT NULL,
  default_workstation VARCHAR(100),
  is_corrective_operation BOOLEAN DEFAULT FALSE,
  create_job_card_based_on_batch_size BOOLEAN DEFAULT FALSE,
  batch_size INT DEFAULT 1,
  quality_inspection_template VARCHAR(100),
  description LONGTEXT,
  status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  modified_by VARCHAR(100),
  INDEX idx_name (name),
  INDEX idx_workstation (default_workstation),
  INDEX idx_status (status)
);

-- Sub Operations Table
CREATE TABLE IF NOT EXISTS operation_sub_operation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operation_name VARCHAR(100) NOT NULL,
  no INT,
  operation VARCHAR(255),
  operation_time DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (operation_name) REFERENCES operation(name) ON DELETE CASCADE,
  INDEX idx_operation (operation_name)
);
