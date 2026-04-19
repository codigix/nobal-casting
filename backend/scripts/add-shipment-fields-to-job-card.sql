
-- Add shipment/dispatch related columns to job_card table
ALTER TABLE job_card ADD COLUMN carrier_name VARCHAR(255);
ALTER TABLE job_card ADD COLUMN tracking_number VARCHAR(100);
ALTER TABLE job_card ADD COLUMN dispatch_date DATE;
ALTER TABLE job_card ADD COLUMN shipping_notes TEXT;
ALTER TABLE job_card ADD COLUMN is_partial BOOLEAN DEFAULT FALSE;
