-- Migration to align purchase_order and purchase_order_item with Model expectations
USE nobalcasting;

-- Update purchase_order table
ALTER TABLE purchase_order 
ADD COLUMN IF NOT EXISTS mr_id VARCHAR(50) AFTER po_no,
ADD COLUMN IF NOT EXISTS shipping_address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS shipping_address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(20),
ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100) DEFAULT 'India',
ADD COLUMN IF NOT EXISTS payment_terms_description TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS invoice_portion DECIMAL(5,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50) DEFAULT 'GST',
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS incoterm VARCHAR(50) DEFAULT 'EXW',
ADD COLUMN IF NOT EXISTS shipping_rule VARCHAR(100);

-- Rename taxes_and_charges_template_id to tax_template_id if it exists and tax_template_id doesn't
SET @dbname = DATABASE();
SET @tablename = 'purchase_order';
SET @oldcolname = 'taxes_and_charges_template_id';
SET @newcolname = 'tax_template_id';

SELECT COUNT(*) INTO @colExists FROM information_schema.columns 
WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @newcolname;

SELECT COUNT(*) INTO @oldColExists FROM information_schema.columns 
WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @oldcolname;

SET @renameQuery = IF(@colExists = 0 AND @oldColExists > 0, 
    CONCAT('ALTER TABLE ', @tablename, ' CHANGE ', @oldcolname, ' ', @newcolname, ' VARCHAR(50)'),
    'SELECT "Column already exists or old column missing"'
);

PREPARE stmt FROM @renameQuery;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- If neither exists, add tax_template_id
SELECT COUNT(*) INTO @colExistsFinal FROM information_schema.columns 
WHERE table_schema = @dbname AND table_name = @tablename AND column_name = @newcolname;

SET @addQuery = IF(@colExistsFinal = 0,
    CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @newcolname, ' VARCHAR(50) AFTER currency'),
    'SELECT "tax_template_id already exists"'
);

PREPARE stmt2 FROM @addQuery;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Update purchase_order_item table
ALTER TABLE purchase_order_item
ADD COLUMN IF NOT EXISTS po_item_id VARCHAR(50) FIRST,
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;

-- Optional: If mr_id exists, add foreign key
-- ALTER TABLE purchase_order ADD CONSTRAINT fk_po_mr FOREIGN KEY (mr_id) REFERENCES material_request(mr_id) ON DELETE SET NULL;
