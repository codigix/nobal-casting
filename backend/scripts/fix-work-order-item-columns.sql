-- Fix missing columns in work_order_item table
ALTER TABLE work_order_item ADD COLUMN IF NOT EXISTS issued_qty DECIMAL(18,6) DEFAULT 0 AFTER transferred_qty;
ALTER TABLE work_order_item ADD COLUMN IF NOT EXISTS scrap_qty DECIMAL(18,6) DEFAULT 0 AFTER returned_qty;

-- If transferred_qty has data but issued_qty is 0, sync them
UPDATE work_order_item SET issued_qty = transferred_qty WHERE (issued_qty IS NULL OR issued_qty = 0) AND transferred_qty > 0;
