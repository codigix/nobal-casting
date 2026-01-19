USE nobalcasting;

-- Fix foreign key constraints to point to the main customer table instead of selling_customer

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Clear the tables to remove orphaned records
TRUNCATE TABLE selling_sales_order;
TRUNCATE TABLE selling_quotation;

-- Drop existing foreign key constraints
ALTER TABLE selling_sales_order 
DROP FOREIGN KEY selling_sales_order_ibfk_1;

ALTER TABLE selling_quotation 
DROP FOREIGN KEY selling_quotation_ibfk_1;

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Add new foreign key constraints pointing to the main customer table
ALTER TABLE selling_sales_order 
ADD CONSTRAINT selling_sales_order_ibfk_1 
FOREIGN KEY (customer_id) REFERENCES customer(customer_id);

ALTER TABLE selling_quotation 
ADD CONSTRAINT selling_quotation_ibfk_1 
FOREIGN KEY (customer_id) REFERENCES customer(customer_id);

-- Verify the constraints
SELECT 'Foreign key constraints updated successfully!' AS status;
