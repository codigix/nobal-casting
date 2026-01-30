
-- Migration to add mr_id to purchase_order for Material Request sourcing
USE nobalcasting;

ALTER TABLE purchase_order ADD COLUMN mr_id VARCHAR(50) NULL AFTER po_no;
CREATE INDEX idx_purchase_order_mr_id ON purchase_order(mr_id);

-- Also make supplier_id nullable because when creating from MR, supplier might not be known yet
ALTER TABLE purchase_order MODIFY COLUMN supplier_id VARCHAR(50) NULL;
