-- Update Sales Order Status ENUM to support new status values
ALTER TABLE selling_sales_order 
MODIFY COLUMN status ENUM('draft', 'confirmed', 'production', 'complete', 'on_hold', 'dispatched', 'delivered') DEFAULT 'draft';
