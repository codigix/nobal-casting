-- =====================================================
-- SELLING MODULE SCHEMA
-- Tables for Quotations, Sales Orders, Delivery Notes, and Invoices
-- =====================================================

-- Customer Table (for Selling module)
CREATE TABLE IF NOT EXISTS selling_customer (
  customer_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  gstin VARCHAR(20),
  billing_address TEXT,
  shipping_address TEXT,
  credit_limit DECIMAL(15, 2) DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_name (name),
  INDEX idx_email (email),
  INDEX idx_status (status)
);

-- Quotation Table
CREATE TABLE IF NOT EXISTS selling_quotation (
  quotation_id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  validity_date DATE,
  notes TEXT,
  status ENUM('draft', 'sent', 'accepted', 'rejected') DEFAULT 'draft',
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES selling_customer(customer_id),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Sales Order Table
CREATE TABLE IF NOT EXISTS selling_sales_order (
  sales_order_id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  quotation_id VARCHAR(50),
  order_amount DECIMAL(15, 2) NOT NULL,
  delivery_date DATE,
  order_terms TEXT,
  status ENUM('draft', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'draft',
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES selling_customer(customer_id),
  FOREIGN KEY (quotation_id) REFERENCES selling_quotation(quotation_id),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Delivery Note Table
CREATE TABLE IF NOT EXISTS selling_delivery_note (
  delivery_note_id VARCHAR(50) PRIMARY KEY,
  sales_order_id VARCHAR(50) NOT NULL,
  delivery_date DATE NOT NULL,
  quantity DECIMAL(10, 2),
  driver_name VARCHAR(100),
  vehicle_info VARCHAR(100),
  remarks TEXT,
  status ENUM('draft', 'delivered', 'returned', 'cancelled') DEFAULT 'draft',
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (sales_order_id) REFERENCES selling_sales_order(sales_order_id),
  INDEX idx_sales_order (sales_order_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Invoice Table
CREATE TABLE IF NOT EXISTS selling_invoice (
  invoice_id VARCHAR(50) PRIMARY KEY,
  delivery_note_id VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  due_date DATE,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  invoice_type ENUM('standard', 'credit_note', 'debit_note') DEFAULT 'standard',
  status ENUM('draft', 'issued', 'paid', 'cancelled') DEFAULT 'draft',
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (delivery_note_id) REFERENCES selling_delivery_note(delivery_note_id),
  INDEX idx_delivery_note (delivery_note_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);