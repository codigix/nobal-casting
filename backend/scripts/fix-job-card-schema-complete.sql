-- Migration to add missing columns to job_card table
-- Based on ProductionModel.createJobCard requirements

ALTER TABLE job_card ADD COLUMN IF NOT EXISTS operation_sequence INT AFTER operation;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS operation_type ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE' AFTER operation_sequence;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS execution_mode ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE' AFTER operation_type;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS vendor_id INT DEFAULT NULL AFTER execution_mode;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS vendor_rate_per_unit DECIMAL(15,2) DEFAULT 0 AFTER vendor_id;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS subcontract_status VARCHAR(50) DEFAULT NULL AFTER vendor_rate_per_unit;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS sent_qty DECIMAL(18,6) DEFAULT 0 AFTER subcontract_status;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS received_qty DECIMAL(18,6) DEFAULT 0 AFTER sent_qty;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS accepted_qty DECIMAL(18,6) DEFAULT 0 AFTER received_qty;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS rejected_qty DECIMAL(18,6) DEFAULT 0 AFTER accepted_qty;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS accepted_quantity DECIMAL(18,6) DEFAULT 0 AFTER rejected_quantity;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS scrap_quantity DECIMAL(18,6) DEFAULT 0 AFTER accepted_quantity;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS setup_time DECIMAL(10,2) DEFAULT 0 AFTER scrap_quantity;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS cycle_time DECIMAL(10,2) DEFAULT 0 AFTER setup_time;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(15,2) DEFAULT 0 AFTER operation_time;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS operating_cost DECIMAL(18,6) DEFAULT 0 AFTER hourly_rate;
ALTER TABLE job_card ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' AFTER notes;

-- Add indexes for common search fields
CREATE INDEX idx_jc_operation_type ON job_card(operation_type);
CREATE INDEX idx_jc_execution_mode ON job_card(execution_mode);
CREATE INDEX idx_jc_vendor_id ON job_card(vendor_id);
CREATE INDEX idx_jc_priority ON job_card(priority);
