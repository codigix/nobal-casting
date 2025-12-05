USE aluminium_erp;

-- Add columns to grn_request_items if they don't exist
ALTER TABLE grn_request_items 
ADD COLUMN qc_status VARCHAR(50) DEFAULT 'pass' COMMENT 'QC Status: pass, fail, hold',
ADD COLUMN bin_rack VARCHAR(100) COMMENT 'Warehouse bin/rack location',
ADD COLUMN valuation_rate DECIMAL(18, 4) DEFAULT 0 COMMENT 'Cost per unit for inventory valuation';
