-- =====================================================
-- ADD BOM DETAILS TO SALES ORDER
-- Store BOM details (finished goods, raw materials, operations) in sales order
-- =====================================================

ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS bom_finished_goods LONGTEXT AFTER order_type;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS bom_raw_materials LONGTEXT AFTER bom_finished_goods;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS bom_operations LONGTEXT AFTER bom_raw_materials;

-- Create index for faster lookups
ALTER TABLE selling_sales_order ADD INDEX IF NOT EXISTS idx_bom_id (bom_id);
ALTER TABLE selling_sales_order ADD INDEX IF NOT EXISTS idx_customer_id (customer_id);
