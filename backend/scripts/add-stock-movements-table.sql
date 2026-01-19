-- ============================================================================
-- STOCK MOVEMENTS TABLE - Support for Stock IN, OUT, and TRANSFER
-- ============================================================================

-- Create stock_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_no VARCHAR(50) UNIQUE NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  warehouse_id INT,
  source_warehouse_id INT,
  target_warehouse_id INT,
  movement_type ENUM('IN', 'OUT', 'TRANSFER') NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL,
  reference_type VARCHAR(50),
  reference_name VARCHAR(100),
  notes TEXT,
  status ENUM('Pending', 'Approved', 'Cancelled') DEFAULT 'Pending',
  created_by VARCHAR(100),
  approved_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME,
  rejection_reason TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (target_warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  INDEX idx_transaction_no (transaction_no),
  INDEX idx_item_code (item_code),
  INDEX idx_movement_type (movement_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes for warehouse queries (handled in table definition above)
