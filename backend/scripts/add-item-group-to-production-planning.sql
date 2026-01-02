-- Add bom_id to production_plan table if it doesn't exist
ALTER TABLE production_plan 
ADD COLUMN IF NOT EXISTS bom_id VARCHAR(100) AFTER sales_order_id;

-- Add item_group column to production_plan_raw_material table if it doesn't exist
ALTER TABLE production_plan_raw_material 
ADD COLUMN IF NOT EXISTS item_group VARCHAR(100) AFTER item_type;

-- Add item_group column to production_plan_fg table if it doesn't exist
ALTER TABLE production_plan_fg 
ADD COLUMN IF NOT EXISTS item_group VARCHAR(100) AFTER uom;

-- Add item_group column to production_plan_sub_assembly table if it doesn't exist
ALTER TABLE production_plan_sub_assembly 
ADD COLUMN IF NOT EXISTS item_group VARCHAR(100) AFTER manufacturing_type;
