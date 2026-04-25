
-- Migration: Add comprehensive fields to inward_challan for high-fidelity UI
-- Description: Adds fields for receiving details, inspection, and costs

ALTER TABLE inward_challan 
ADD COLUMN challan_date DATE AFTER challan_number,
ADD COLUMN operation VARCHAR(255) AFTER job_card_id,
ADD COLUMN destination_warehouse_id VARCHAR(100) AFTER outward_challan_id,
ADD COLUMN grn_no VARCHAR(100) AFTER destination_warehouse_id,
ADD COLUMN vehicle_number VARCHAR(100) AFTER grn_no,
ADD COLUMN received_by VARCHAR(255) AFTER vehicle_number,
ADD COLUMN expected_return_date DATE AFTER received_by,
ADD COLUMN actual_return_date DATE AFTER expected_return_date,
ADD COLUMN remarks TEXT AFTER actual_return_date,
ADD COLUMN inspection_by VARCHAR(255) AFTER remarks,
ADD COLUMN inspection_date DATE AFTER inspection_by,
ADD COLUMN quality_status VARCHAR(50) DEFAULT 'Accepted' AFTER inspection_date,
ADD COLUMN rate_type VARCHAR(20) DEFAULT 'Per Unit' AFTER quantity_rejected,
ADD COLUMN rate DECIMAL(18, 4) DEFAULT 0 AFTER rate_type,
ADD COLUMN total_cost DECIMAL(18, 4) DEFAULT 0 AFTER rate;

CREATE TABLE IF NOT EXISTS inward_challan_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challan_id INT NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255),
  batch_no VARCHAR(100),
  dispatched_qty DECIMAL(18, 4) DEFAULT 0,
  received_qty DECIMAL(18, 4) DEFAULT 0,
  accepted_qty DECIMAL(18, 4) DEFAULT 0,
  rejected_qty DECIMAL(18, 4) DEFAULT 0,
  uom VARCHAR(50),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challan_id) REFERENCES inward_challan(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_ic_destination_warehouse ON inward_challan(destination_warehouse_id);
CREATE INDEX idx_ic_grn_no ON inward_challan(grn_no);
CREATE INDEX idx_ic_challan_date ON inward_challan(challan_date);
