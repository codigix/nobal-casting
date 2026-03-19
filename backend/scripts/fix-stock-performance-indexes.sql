-- Fix missing indexes for stock management performance
-- Migration script to optimize queries using item_code instead of item_id

-- 1. Optimize stock_balance
CREATE INDEX idx_stock_balance_item_code_warehouse ON stock_balance(item_code, warehouse_id);

-- 2. Optimize stock_ledger
CREATE INDEX idx_stock_ledger_item_code_warehouse_date ON stock_ledger(item_code, warehouse_id, transaction_date);
CREATE INDEX idx_stock_ledger_item_code ON stock_ledger(item_code);

-- 3. Optimize stock_entry_items
CREATE INDEX idx_stock_entry_items_item_code ON stock_entry_items(item_code);
CREATE INDEX idx_stock_entry_items_entry_id_item_code ON stock_entry_items(stock_entry_id, item_code);

-- 4. Sync item table valuation_rate
-- item_code is likely PK already, but adding it just in case it's not indexed
-- CREATE INDEX idx_item_item_code ON item(item_code);
