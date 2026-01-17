-- Add IN/OUT columns to stock_balance table
ALTER TABLE stock_balance ADD COLUMN opening_qty DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE stock_balance ADD COLUMN opening_value DECIMAL(16, 2) DEFAULT 0;
ALTER TABLE stock_balance ADD COLUMN in_quantity DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE stock_balance ADD COLUMN in_value DECIMAL(16, 2) DEFAULT 0;
ALTER TABLE stock_balance ADD COLUMN out_quantity DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE stock_balance ADD COLUMN out_value DECIMAL(16, 2) DEFAULT 0;
