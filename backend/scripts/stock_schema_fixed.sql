-- ============================================================================
-- STOCK / INVENTORY MANAGEMENT MODULE - FIXED DATABASE SCHEMA
-- ============================================================================

-- 1. WAREHOUSE TABLE - Define physical and logical storage areas
CREATE TABLE IF NOT EXISTS warehouses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  warehouse_code VARCHAR(50) UNIQUE NOT NULL,
  warehouse_name VARCHAR(255) NOT NULL,
  warehouse_type ENUM('Raw Material', 'Finished Goods', 'Scrap', 'WIP') NOT NULL,
  parent_warehouse_id INT,
  location VARCHAR(255),
  department VARCHAR(50) NOT NULL DEFAULT 'all',
  capacity DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  updated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_warehouse_id) REFERENCES warehouses(id),
  INDEX idx_warehouse_code (warehouse_code),
  INDEX idx_warehouse_type (warehouse_type),
  INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. STOCK BALANCE TABLE - Maintain current stock per item and warehouse
CREATE TABLE IF NOT EXISTS stock_balance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  current_qty DECIMAL(12, 2) DEFAULT 0,
  reserved_qty DECIMAL(12, 2) DEFAULT 0,
  available_qty DECIMAL(12, 2) DEFAULT 0,
  valuation_rate DECIMAL(12, 4) DEFAULT 0,
  total_value DECIMAL(16, 2) DEFAULT 0,
  last_receipt_date DATETIME,
  last_issue_date DATETIME,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_reason VARCHAR(255),
  locked_by INT,
  locked_at DATETIME,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_item_warehouse (item_id, warehouse_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (locked_by) REFERENCES users(id),
  INDEX idx_available_qty (available_qty),
  INDEX idx_item_id (item_id),
  INDEX idx_warehouse_id (warehouse_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. STOCK LEDGER TABLE - Real-time log of all stock transactions
CREATE TABLE IF NOT EXISTS stock_ledger (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  transaction_date DATETIME NOT NULL,
  transaction_type ENUM('Purchase Receipt', 'Issue', 'Transfer', 'Manufacturing Return', 'Repack', 'Scrap Entry', 'Reconciliation', 'Adjustment') NOT NULL,
  qty_in DECIMAL(12, 2) DEFAULT 0,
  qty_out DECIMAL(12, 2) DEFAULT 0,
  balance_qty DECIMAL(12, 2) DEFAULT 0,
  valuation_rate DECIMAL(12, 4) DEFAULT 0,
  transaction_value DECIMAL(16, 2) DEFAULT 0,
  reference_doctype VARCHAR(100),
  reference_name VARCHAR(100),
  remarks TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_item_warehouse_date (item_id, warehouse_id, transaction_date),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_reference (reference_doctype, reference_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. STOCK ENTRY TABLE - Core document for material movements
CREATE TABLE IF NOT EXISTS stock_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entry_no VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATETIME NOT NULL,
  entry_type ENUM('Material Receipt', 'Material Issue', 'Material Transfer', 'Manufacturing Return', 'Repack', 'Scrap Entry') NOT NULL,
  from_warehouse_id INT,
  to_warehouse_id INT,
  purpose VARCHAR(255),
  reference_doctype VARCHAR(100),
  reference_name VARCHAR(100),
  status ENUM('Draft', 'Submitted', 'Cancelled') DEFAULT 'Draft',
  total_qty DECIMAL(12, 2) DEFAULT 0,
  total_value DECIMAL(16, 2) DEFAULT 0,
  remarks TEXT,
  created_by INT NOT NULL,
  updated_by INT,
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submitted_at DATETIME,
  FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_entry_no (entry_no),
  INDEX idx_entry_date (entry_date),
  INDEX idx_status (status),
  INDEX idx_entry_type (entry_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. STOCK ENTRY ITEMS TABLE - Items in stock entry
CREATE TABLE IF NOT EXISTS stock_entry_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stock_entry_id INT NOT NULL,
  item_id INT NOT NULL,
  qty DECIMAL(12, 2) NOT NULL,
  uom VARCHAR(20) DEFAULT 'Kg',
  valuation_rate DECIMAL(12, 4) DEFAULT 0,
  transaction_value DECIMAL(16, 2) DEFAULT 0,
  batch_no VARCHAR(100),
  serial_no VARCHAR(100),
  remarks TEXT,
  FOREIGN KEY (stock_entry_id) REFERENCES stock_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
  INDEX idx_stock_entry_id (stock_entry_id),
  INDEX idx_item_id (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. MATERIAL REQUEST TABLE - Internal material requests
CREATE TABLE IF NOT EXISTS material_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  mr_no VARCHAR(50) UNIQUE NOT NULL,
  request_date DATETIME NOT NULL,
  requested_by INT NOT NULL,
  department VARCHAR(50) NOT NULL,
  required_by_date DATE,
  status ENUM('Draft', 'Pending Approval', 'Approved', 'Issued', 'Cancelled') DEFAULT 'Draft',
  total_qty DECIMAL(12, 2) DEFAULT 0,
  remarks TEXT,
  approved_by INT,
  issued_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (issued_by) REFERENCES users(id),
  INDEX idx_mr_no (mr_no),
  INDEX idx_status (status),
  INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. MATERIAL REQUEST ITEMS TABLE
CREATE TABLE IF NOT EXISTS material_request_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  material_request_id INT NOT NULL,
  item_id INT NOT NULL,
  qty_requested DECIMAL(12, 2) NOT NULL,
  qty_issued DECIMAL(12, 2) DEFAULT 0,
  uom VARCHAR(20) DEFAULT 'Kg',
  warehouse_id INT,
  remarks TEXT,
  FOREIGN KEY (material_request_id) REFERENCES material_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  INDEX idx_material_request_id (material_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MATERIAL TRANSFER TABLE - Inter-warehouse movements
CREATE TABLE IF NOT EXISTS material_transfers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transfer_no VARCHAR(50) UNIQUE NOT NULL,
  transfer_date DATETIME NOT NULL,
  from_warehouse_id INT NOT NULL,
  to_warehouse_id INT NOT NULL,
  status ENUM('Draft', 'In Transit', 'Received', 'Cancelled') DEFAULT 'Draft',
  total_qty DECIMAL(12, 2) DEFAULT 0,
  transfer_remarks TEXT,
  created_by INT NOT NULL,
  received_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id),
  INDEX idx_transfer_no (transfer_no),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. MATERIAL TRANSFER ITEMS TABLE
CREATE TABLE IF NOT EXISTS material_transfer_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  material_transfer_id INT NOT NULL,
  item_id INT NOT NULL,
  qty DECIMAL(12, 2) NOT NULL,
  uom VARCHAR(20) DEFAULT 'Kg',
  batch_no VARCHAR(100),
  serial_no VARCHAR(100),
  FOREIGN KEY (material_transfer_id) REFERENCES material_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
  INDEX idx_material_transfer_id (material_transfer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. BATCH / LOT TRACKING TABLE
CREATE TABLE IF NOT EXISTS batch_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_no VARCHAR(100) UNIQUE NOT NULL,
  item_id INT NOT NULL,
  batch_qty DECIMAL(12, 2) NOT NULL,
  mfg_date DATE,
  expiry_date DATE,
  warehouse_id INT,
  current_qty DECIMAL(12, 2) NOT NULL,
  status ENUM('Active', 'Expired', 'Used', 'Scrapped') DEFAULT 'Active',
  reference_doctype VARCHAR(100),
  reference_name VARCHAR(100),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  INDEX idx_batch_no (batch_no),
  INDEX idx_item_id (item_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. STOCK RECONCILIATION TABLE - Audit and physical stock checks
CREATE TABLE IF NOT EXISTS stock_reconciliation (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reconciliation_no VARCHAR(50) UNIQUE NOT NULL,
  reconciliation_date DATETIME NOT NULL,
  warehouse_id INT NOT NULL,
  purpose VARCHAR(255),
  status ENUM('Draft', 'Submitted', 'Approved', 'Cancelled') DEFAULT 'Draft',
  total_items INT DEFAULT 0,
  variance_count INT DEFAULT 0,
  total_variance_value DECIMAL(16, 2) DEFAULT 0,
  remarks TEXT,
  created_by INT NOT NULL,
  approved_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  INDEX idx_reconciliation_no (reconciliation_no),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. STOCK RECONCILIATION ITEMS TABLE
CREATE TABLE IF NOT EXISTS stock_reconciliation_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reconciliation_id INT NOT NULL,
  item_id INT NOT NULL,
  system_qty DECIMAL(12, 2) NOT NULL,
  physical_qty DECIMAL(12, 2) NOT NULL,
  variance_qty DECIMAL(12, 2) NOT NULL,
  variance_reason VARCHAR(255),
  variance_value DECIMAL(16, 2) DEFAULT 0,
  FOREIGN KEY (reconciliation_id) REFERENCES stock_reconciliation(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  INDEX idx_reconciliation_id (reconciliation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. REORDER MANAGEMENT TABLE - Auto-calculate items below reorder level
CREATE TABLE IF NOT EXISTS reorder_management (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reorder_request_no VARCHAR(50) UNIQUE NOT NULL,
  request_date DATETIME NOT NULL,
  status ENUM('Generated', 'MR Created', 'PO Created', 'Received') DEFAULT 'Generated',
  total_items INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_reorder_request_no (reorder_request_no),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. REORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS reorder_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  reorder_id INT NOT NULL,
  item_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  current_qty DECIMAL(12, 2) NOT NULL,
  reorder_level DECIMAL(12, 2) NOT NULL,
  reorder_qty DECIMAL(12, 2) NOT NULL,
  qty_to_order DECIMAL(12, 2) NOT NULL,
  estimated_cost DECIMAL(16, 2),
  mr_created BOOLEAN DEFAULT FALSE,
  mr_no VARCHAR(50),
  po_created BOOLEAN DEFAULT FALSE,
  po_no VARCHAR(50),
  FOREIGN KEY (reorder_id) REFERENCES reorder_management(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  INDEX idx_reorder_id (reorder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;