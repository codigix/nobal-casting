-- GRN Requests Schema
-- Handles Goods Receipt Notes workflow from purchase to inventory

USE aluminium_erp;

-- GRN Requests Table
CREATE TABLE IF NOT EXISTS grn_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_no VARCHAR(100) UNIQUE NOT NULL,
  po_no VARCHAR(100) NOT NULL,
  supplier_id VARCHAR(100),
  supplier_name VARCHAR(255),
  receipt_date DATETIME,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'inspecting', 'awaiting_inventory_approval', 'approved', 'rejected', 'sent_back') DEFAULT 'pending',
  assigned_to INT,
  approval_date DATETIME,
  approved_by INT,
  inspection_completed_by INT,
  rejection_date DATETIME,
  rejection_reason TEXT,
  total_items INT DEFAULT 0,
  total_accepted INT DEFAULT 0,
  total_rejected INT DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (inspection_completed_by) REFERENCES users(id),
  INDEX idx_grn_no (grn_no),
  INDEX idx_po_no (po_no),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_created_at (created_at)
);

-- GRN Request Items Table
CREATE TABLE IF NOT EXISTS grn_request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_request_id INT NOT NULL,
  item_code VARCHAR(100),
  item_name VARCHAR(255),
  po_qty DECIMAL(18,4),
  received_qty DECIMAL(18,4),
  accepted_qty DECIMAL(18,4) DEFAULT 0,
  rejected_qty DECIMAL(18,4) DEFAULT 0,
  batch_no VARCHAR(100),
  warehouse_name VARCHAR(255),
  item_status ENUM('pending', 'accepted', 'rejected', 'partially_accepted') DEFAULT 'pending',
  qc_checks JSON,
  notes TEXT,
  inspected_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (grn_request_id) REFERENCES grn_requests(id) ON DELETE CASCADE,
  INDEX idx_grn_request_id (grn_request_id),
  INDEX idx_item_status (item_status),
  INDEX idx_item_code (item_code)
);

-- GRN Request Logs Table (Audit Trail)
CREATE TABLE IF NOT EXISTS grn_request_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_request_id INT NOT NULL,
  action VARCHAR(100),
  status_from VARCHAR(50),
  status_to VARCHAR(50),
  reason TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grn_request_id) REFERENCES grn_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_grn_request_id (grn_request_id),
  INDEX idx_created_at (created_at)
);
