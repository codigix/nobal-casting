-- =====================================================
-- FIX SELLING_SALES_ORDER SCHEMA
-- Add missing columns to support full functionality
-- =====================================================

ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) AFTER customer_id;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255) AFTER customer_name;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20) AFTER customer_email;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS items LONGTEXT AFTER order_terms;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS bom_id VARCHAR(50) AFTER items;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS bom_name VARCHAR(255) AFTER bom_id;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS source_warehouse VARCHAR(50) AFTER bom_name;
ALTER TABLE selling_sales_order ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) AFTER source_warehouse;

-- Update the foreign key constraint if it's pointing to selling_customer instead of customer
-- First, check if the constraint exists and drop it
ALTER TABLE selling_sales_order DROP CONSTRAINT IF EXISTS selling_sales_order_ibfk_1;

-- Add the correct foreign key to the customer table
ALTER TABLE selling_sales_order ADD CONSTRAINT fk_selling_sales_order_customer 
FOREIGN KEY (customer_id) REFERENCES customer(customer_id);

-- Optionally, keep the quotation foreign key
-- ALTER TABLE selling_sales_order DROP CONSTRAINT IF EXISTS selling_sales_order_ibfk_2;
-- ALTER TABLE selling_sales_order ADD CONSTRAINT fk_selling_sales_order_quotation 
-- FOREIGN KEY (quotation_id) REFERENCES selling_quotation(quotation_id);
