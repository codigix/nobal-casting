-- Add Shipping Address and Payment Terms fields to Purchase Order

ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS shipping_address_line1 VARCHAR(255);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS shipping_address_line2 VARCHAR(255);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(20);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100);

-- Payment Terms fields
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_terms_description VARCHAR(255);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS invoice_portion DECIMAL(5,2) DEFAULT 100;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(15,2) DEFAULT 0;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS tax_category VARCHAR(50);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,2) DEFAULT 0;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS final_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS incoterm VARCHAR(50);
ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS shipping_rule VARCHAR(255);

-- Create Payment Reminders table
CREATE TABLE IF NOT EXISTS payment_reminder (
  reminder_id VARCHAR(50) PRIMARY KEY,
  po_no VARCHAR(50) NOT NULL,
  supplier_id VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  payment_amount DECIMAL(15,2),
  reminder_status ENUM('pending', 'sent', 'acknowledged', 'paid') DEFAULT 'pending',
  sent_to_dept VARCHAR(100),
  sent_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (po_no) REFERENCES purchase_order(po_no),
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  INDEX idx_po (po_no),
  INDEX idx_status (reminder_status),
  INDEX idx_due_date (due_date)
);
