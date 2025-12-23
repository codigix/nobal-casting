-- Add sales_order_id column to production_plan if it doesn't exist
ALTER TABLE production_plan 
ADD COLUMN IF NOT EXISTS sales_order_id VARCHAR(100),
ADD INDEX IF NOT EXISTS idx_sales_order_id (sales_order_id);
