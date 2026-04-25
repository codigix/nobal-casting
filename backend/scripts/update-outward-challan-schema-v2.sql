
-- Migration: Add comprehensive fields to outward_challan for high-fidelity UI
-- Description: Adds fields for dispatch type, warehouses, costs, and enhanced logistics

ALTER TABLE outward_challan 
ADD COLUMN dispatch_type VARCHAR(20) DEFAULT 'Partial' AFTER challan_number,
ADD COLUMN source_warehouse_id VARCHAR(100) AFTER vendor_id,
ADD COLUMN vendor_warehouse_id VARCHAR(100) AFTER source_warehouse_id,
ADD COLUMN reference_no VARCHAR(100) AFTER vendor_warehouse_id,
ADD COLUMN rate_type VARCHAR(20) DEFAULT 'Per Unit' AFTER dispatch_quantity,
ADD COLUMN rate DECIMAL(18, 4) DEFAULT 0 AFTER rate_type,
ADD COLUMN total_cost DECIMAL(18, 4) DEFAULT 0 AFTER rate,
ADD COLUMN driver_name VARCHAR(255) AFTER eway_bill_no,
ADD COLUMN contact_no VARCHAR(20) AFTER driver_name,
ADD COLUMN remarks TEXT AFTER contact_no;

ALTER TABLE outward_challan_item
ADD COLUMN item_name VARCHAR(255) AFTER item_code,
ADD COLUMN batch_no VARCHAR(100) AFTER item_name,
ADD COLUMN available_qty DECIMAL(18, 4) DEFAULT 0 AFTER batch_no;

-- Indexes for performance
CREATE INDEX idx_oc_vendor_warehouse ON outward_challan(vendor_warehouse_id);
CREATE INDEX idx_oc_source_warehouse ON outward_challan(source_warehouse_id);
CREATE INDEX idx_oc_dispatch_type ON outward_challan(dispatch_type);
