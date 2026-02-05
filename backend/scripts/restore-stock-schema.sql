-- ============================================================================
-- RESTORE STOCK SCHEMA: Align with item(item_code)
-- ============================================================================

USE nobalcasting;

-- 2. Add Foreign Keys to existing stock tables (if missing)
-- stock_balance
ALTER TABLE stock_balance MODIFY COLUMN item_code VARCHAR(100) NOT NULL;
ALTER TABLE stock_balance ADD CONSTRAINT fk_stock_balance_item 
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE;
ALTER TABLE stock_balance ADD CONSTRAINT fk_stock_balance_warehouse 
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;

-- stock_ledger
ALTER TABLE stock_ledger MODIFY COLUMN item_code VARCHAR(100) NOT NULL;
ALTER TABLE stock_ledger ADD CONSTRAINT fk_stock_ledger_item 
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE;
ALTER TABLE stock_ledger ADD CONSTRAINT fk_stock_ledger_warehouse 
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;

-- stock_entry_items
ALTER TABLE stock_entry_items MODIFY COLUMN item_code VARCHAR(100) NOT NULL;
ALTER TABLE stock_entry_items ADD CONSTRAINT fk_stock_entry_items_item 
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE RESTRICT;

-- 3. Update Views (correctly referencing item table)
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
    WHEN sb.available_qty < i.reorder_level THEN 'Below Reorder'
    WHEN sb.available_qty < i.reorder_level * 1.5 THEN 'Near Reorder'
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
  SUM(sb.total_value) AS total_value,
  i.valuation_method
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
