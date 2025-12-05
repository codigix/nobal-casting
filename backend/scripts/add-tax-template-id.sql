-- Add tax_template_id column to purchase_order if it doesn't exist
USE aluminium_erp;

-- Check and add tax_template_id column if it doesn't exist
ALTER TABLE purchase_order 
ADD COLUMN IF NOT EXISTS tax_template_id VARCHAR(50) AFTER currency;

-- Add foreign key constraint if needed
ALTER TABLE purchase_order 
ADD CONSTRAINT fk_po_tax_template FOREIGN KEY (tax_template_id) REFERENCES taxes_and_charges_template(template_id) ON DELETE SET NULL;
