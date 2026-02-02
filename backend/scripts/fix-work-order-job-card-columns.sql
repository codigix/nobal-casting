-- Fix missing columns in work_order_operation and job_card tables

-- Add missing columns to work_order_operation
ALTER TABLE work_order_operation ADD COLUMN hourly_rate DECIMAL(15,2) DEFAULT 0;
ALTER TABLE work_order_operation ADD COLUMN operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE';
ALTER TABLE work_order_operation ADD COLUMN operating_cost DECIMAL(18,6) DEFAULT 0;

-- Add missing columns to job_card
ALTER TABLE job_card ADD COLUMN operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE';
ALTER TABLE job_card ADD COLUMN accepted_quantity DECIMAL(18,6) DEFAULT 0;
ALTER TABLE job_card ADD COLUMN scrap_quantity DECIMAL(18,6) DEFAULT 0;
ALTER TABLE job_card ADD COLUMN hourly_rate DECIMAL(15,2) DEFAULT 0;
ALTER TABLE job_card ADD COLUMN operating_cost DECIMAL(18,6) DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX idx_woo_operation_type ON work_order_operation(operation_type);
CREATE INDEX idx_jc_operation_type ON job_card(operation_type);
