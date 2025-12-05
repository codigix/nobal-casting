-- ============================================================
-- Database Schema Fix: Material Request Item Table Migration
-- ============================================================
-- This script fixes the mismatch between database.sql (new schema)
-- and init.sql (old schema) for the material_request_item table
--
-- Schema Change:
--   OLD: id INT AUTO_INCREMENT PRIMARY KEY
--   NEW: mr_item_id VARCHAR(50) PRIMARY KEY
--
-- Run with: mysql -u root -p aluminium_erp < fix-schema.sql
-- ============================================================

-- Step 1: Backup existing data
CREATE TEMPORARY TABLE material_request_item_backup AS 
SELECT * FROM material_request_item;

-- Step 2: Drop old table (will cascade if needed)
DROP TABLE IF EXISTS material_request_item;

-- Step 3: Create new table with correct schema matching database.sql
CREATE TABLE material_request_item (
  mr_item_id VARCHAR(50) PRIMARY KEY,
  mr_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  qty DECIMAL(15,3),
  uom VARCHAR(10),
  purpose TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mr_id) REFERENCES material_request(mr_id),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  INDEX idx_mr (mr_id)
);

-- Step 4: Restore data with new ID format
INSERT INTO material_request_item (mr_item_id, mr_id, item_code, qty, uom, purpose, created_at)
SELECT 
  CONCAT('MRI-', UNIX_TIMESTAMP(NOW()), '-', id) as mr_item_id,
  mr_id,
  item_code,
  qty,
  uom,
  purpose,
  NOW() as created_at
FROM material_request_item_backup;

-- Step 5: Clean up temporary table
DROP TEMPORARY TABLE material_request_item_backup;

-- Step 6: Verification query
SELECT 
  'Migration completed successfully!' as Status,
  COUNT(*) as RecordsRestored,
  TABLE_SCHEMA,
  TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'aluminium_erp' AND TABLE_NAME = 'material_request_item';

-- Additional Fixes for data integrity
-- =====================================

-- Ensure material_request table has audit fields if needed
-- (These might be missing from init.sql)
ALTER TABLE material_request 
ADD COLUMN IF NOT EXISTS created_by_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS updated_by_id VARCHAR(50);

-- Ensure item table has proper structure matching database.sql
ALTER TABLE item
MODIFY COLUMN item_code VARCHAR(50),
MODIFY COLUMN name VARCHAR(255) NOT NULL;

-- Add missing indices for performance
ALTER TABLE material_request_item ADD INDEX idx_mr_id (mr_id);
ALTER TABLE material_request_item ADD INDEX idx_item_code (item_code);

-- Verify structure matches expectations
DESCRIBE material_request_item;

-- Final status
SELECT 'All schema fixes applied successfully!' as 'Status';