-- Fix stock_balance table to use item_code instead of item_id
-- This aligns with the actual item table structure which uses item_code as primary key

-- Drop foreign key constraint if it exists
ALTER TABLE stock_balance DROP FOREIGN KEY IF EXISTS stock_balance_ibfk_1;

-- Drop unique key
ALTER TABLE stock_balance DROP KEY IF EXISTS unique_item_warehouse;

-- Drop index
ALTER TABLE stock_balance DROP KEY IF EXISTS idx_item_id;

-- Change item_id column to item_code
ALTER TABLE stock_balance CHANGE COLUMN item_id item_code VARCHAR(50) NOT NULL;

-- Add back unique constraint with item_code
ALTER TABLE stock_balance ADD UNIQUE KEY unique_item_warehouse (item_code, warehouse_id);

-- Add back foreign key constraint
ALTER TABLE stock_balance ADD FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE;

-- Add index on item_code
ALTER TABLE stock_balance ADD INDEX idx_item_code (item_code);

-- Also fix stock_ledger table to ensure it uses item_code
ALTER TABLE stock_ledger DROP FOREIGN KEY IF EXISTS stock_ledger_ibfk_1;
ALTER TABLE stock_ledger DROP KEY IF EXISTS idx_item_warehouse_date;

ALTER TABLE stock_ledger CHANGE COLUMN item_id item_code VARCHAR(50) NOT NULL;

ALTER TABLE stock_ledger ADD FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE;
ALTER TABLE stock_ledger ADD INDEX idx_item_warehouse_date (item_code, warehouse_id, transaction_date);
