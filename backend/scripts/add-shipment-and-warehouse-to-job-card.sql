
-- Migration: Add shipment and warehouse fields to job_card
-- Description: Adds columns to support dispatch/shipment workflow and warehouse transfers

-- Carrier/Tracking (Legacy/Optional)
ALTER TABLE job_card ADD COLUMN carrier_name VARCHAR(255);
ALTER TABLE job_card ADD COLUMN tracking_number VARCHAR(100);

-- Shipment Core Fields
ALTER TABLE job_card ADD COLUMN dispatch_date DATE;
ALTER TABLE job_card ADD COLUMN shipping_notes TEXT;
ALTER TABLE job_card ADD COLUMN is_partial BOOLEAN DEFAULT FALSE;
ALTER TABLE job_card ADD COLUMN is_shipment BOOLEAN DEFAULT FALSE;

-- Warehouse and Transfer Fields
ALTER TABLE job_card ADD COLUMN source_warehouse_id VARCHAR(100);
ALTER TABLE job_card ADD COLUMN target_warehouse_id VARCHAR(100);
ALTER TABLE job_card ADD COLUMN dispatch_qty DECIMAL(18, 4) DEFAULT 0;

-- Indexes for performance
CREATE INDEX idx_job_card_dispatch_date ON job_card(dispatch_date);
CREATE INDEX idx_job_card_is_shipment ON job_card(is_shipment);

-- Fix outward_challan missing columns
ALTER TABLE outward_challan ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(255);
ALTER TABLE outward_challan ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
ALTER TABLE outward_challan ADD COLUMN IF NOT EXISTS eway_bill_no VARCHAR(100);
ALTER TABLE outward_challan ADD COLUMN IF NOT EXISTS dispatch_date DATE;
