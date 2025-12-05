-- ============================================================================
-- MIGRATION: Fix Stock Tables to use item_code instead of item_id
-- ============================================================================
-- This migration alters the stock_entry_items, stock_balance, and stock_ledger tables
-- to use item_code (VARCHAR) instead of item_id (INT) to match the item table structure

-- 1. Modify stock_entry_items table
ALTER TABLE stock_entry_items 
  MODIFY COLUMN item_id INT,
  ADD COLUMN item_code VARCHAR(50) AFTER item_id;

UPDATE stock_entry_items sei
SET sei.item_code = (
  SELECT i.item_code FROM item i WHERE i.id = sei.item_id LIMIT 1
);

ALTER TABLE stock_entry_items 
  DROP FOREIGN KEY stock_entry_items_ibfk_2,
  DROP INDEX idx_item_id,
  DROP COLUMN item_id,
  MODIFY COLUMN item_code VARCHAR(50) NOT NULL,
  ADD CONSTRAINT fk_stock_entry_items_item 
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE RESTRICT,
  ADD INDEX idx_item_code (item_code);

-- 2. Modify stock_balance table
ALTER TABLE stock_balance 
  MODIFY COLUMN item_id INT,
  ADD COLUMN item_code VARCHAR(50) AFTER item_id;

UPDATE stock_balance sb
SET sb.item_code = (
  SELECT i.item_code FROM item i WHERE i.id = sb.item_id LIMIT 1
);

ALTER TABLE stock_balance 
  DROP FOREIGN KEY stock_balance_ibfk_1,
  DROP KEY unique_item_warehouse,
  DROP INDEX idx_item_id,
  DROP COLUMN item_id,
  MODIFY COLUMN item_code VARCHAR(50) NOT NULL,
  ADD CONSTRAINT fk_stock_balance_item 
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE,
  ADD UNIQUE KEY unique_item_warehouse (item_code, warehouse_id),
  ADD INDEX idx_item_code (item_code);

-- 3. Modify stock_ledger table
ALTER TABLE stock_ledger 
  MODIFY COLUMN item_id INT,
  ADD COLUMN item_code VARCHAR(50) AFTER item_id;

UPDATE stock_ledger sl
SET sl.item_code = (
  SELECT i.item_code FROM item i WHERE i.id = sl.item_id LIMIT 1
);

ALTER TABLE stock_ledger 
  DROP FOREIGN KEY stock_ledger_ibfk_1,
  DROP INDEX idx_item_warehouse_date,
  DROP INDEX idx_item_id,
  DROP COLUMN item_id,
  MODIFY COLUMN item_code VARCHAR(50) NOT NULL,
  ADD CONSTRAINT fk_stock_ledger_item 
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE,
  ADD INDEX idx_item_warehouse_date (item_code, warehouse_id, transaction_date),
  ADD INDEX idx_item_code (item_code);

-- Update any views that reference item_id
DROP VIEW IF EXISTS v_stock_balance_summary;
CREATE OR REPLACE VIEW v_stock_balance_summary AS
SELECT 
  sb.id,
  i.item_code,
  i.name as item_name,
  w.warehouse_code,
  w.warehouse_name,
  sb.current_qty,
  sb.reserved_qty,
  sb.available_qty,
  sb.valuation_rate,
  sb.total_value,
  sb.updated_at,
  CASE 
    WHEN sb.available_qty < COALESCE((SELECT reorder_level FROM item WHERE item_code = i.item_code), 0) THEN 'Below Reorder'
    WHEN sb.available_qty < COALESCE((SELECT reorder_level FROM item WHERE item_code = i.item_code), 0) * 1.5 THEN 'Near Reorder'
    ELSE 'Normal'
  END AS stock_status
FROM stock_balance sb
JOIN item i ON sb.item_code = i.item_code
JOIN warehouses w ON sb.warehouse_id = w.id;

DROP VIEW IF EXISTS v_stock_valuation_report;
CREATE OR REPLACE VIEW v_stock_valuation_report AS
SELECT 
  i.item_code,
  i.name as item_name,
  w.warehouse_name,
  SUM(sb.current_qty) AS total_qty,
  AVG(sb.valuation_rate) AS avg_rate,
  SUM(sb.total_value) AS total_value
FROM stock_balance sb
JOIN item i ON sb.item_code = i.item_code
JOIN warehouses w ON sb.warehouse_id = w.id
GROUP BY i.item_code, w.id;

DROP VIEW IF EXISTS v_slow_moving_items;
CREATE OR REPLACE VIEW v_slow_moving_items AS
SELECT 
  i.item_code,
  i.name as item_name,
  sb.current_qty,
  DATEDIFF(CURDATE(), sb.last_issue_date) AS days_since_issue,
  sb.total_value
FROM stock_balance sb
JOIN item i ON sb.item_code = i.item_code
WHERE sb.last_issue_date IS NULL 
   OR DATEDIFF(CURDATE(), sb.last_issue_date) > 90;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
