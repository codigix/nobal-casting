-- Subcontracting (Outsource) Workflow Migration

-- Add columns to bom_operation
ALTER TABLE bom_operation ADD COLUMN execution_mode ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE';
ALTER TABLE bom_operation ADD COLUMN vendor_rate_per_unit DECIMAL(18,2) DEFAULT 0;

-- Add columns to work_order_operation
ALTER TABLE work_order_operation ADD COLUMN execution_mode ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE';
ALTER TABLE work_order_operation ADD COLUMN vendor_rate_per_unit DECIMAL(18,2) DEFAULT 0;

-- Add columns to job_card
ALTER TABLE job_card ADD COLUMN execution_mode ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE';
ALTER TABLE job_card ADD COLUMN vendor_id VARCHAR(50);
ALTER TABLE job_card ADD COLUMN sent_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE job_card ADD COLUMN received_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE job_card ADD COLUMN accepted_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE job_card ADD COLUMN rejected_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE job_card ADD COLUMN subcontract_status ENUM('DRAFT', 'READY', 'SENT_TO_VENDOR', 'PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED') DEFAULT 'DRAFT';

-- Add foreign key for vendor_id in job_card
ALTER TABLE job_card ADD CONSTRAINT fk_job_card_vendor FOREIGN KEY (vendor_id) REFERENCES supplier(supplier_id);

-- Add index for subcontract_status
CREATE INDEX idx_subcontract_status ON job_card(subcontract_status);
