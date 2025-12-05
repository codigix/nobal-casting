-- Create database and select it
CREATE DATABASE IF NOT EXISTS aluminium_erp;
USE aluminium_erp;

-- ============================================
-- USER AUTHENTICATION
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  department VARCHAR(100) DEFAULT 'buying',
  role VARCHAR(50) DEFAULT 'staff',
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_department (department),
  INDEX idx_role (role)
);

-- ============================================
-- BUYING MODULE
-- ============================================

-- Supplier Groups
CREATE TABLE IF NOT EXISTS supplier_group (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE IF NOT EXISTS supplier (
  supplier_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  supplier_group VARCHAR(255),
  gstin VARCHAR(15),
  contact_person_id VARCHAR(50),
  address_id VARCHAR(50),
  bank_details LONGTEXT,
  payment_terms_days INT DEFAULT 30,
  lead_time_days INT DEFAULT 7,
  rating DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_group) REFERENCES supplier_group(name),
  INDEX idx_name (name),
  INDEX idx_gstin (gstin)
);

-- Contacts
CREATE TABLE IF NOT EXISTS contact (
  contact_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  linked_supplier_id VARCHAR(50),
  linked_customer_id VARCHAR(50),
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (linked_supplier_id) REFERENCES supplier(supplier_id)
);

-- Addresses
CREATE TABLE IF NOT EXISTS address (
  address_id VARCHAR(50) PRIMARY KEY,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Items (Common for all modules)
CREATE TABLE IF NOT EXISTS item (
  item_code VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  uom VARCHAR(50),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Material Requests
CREATE TABLE IF NOT EXISTS material_request (
  mr_id VARCHAR(50) PRIMARY KEY,
  requested_by_id VARCHAR(50),
  department VARCHAR(100),
  request_date DATE,
  required_by_date DATE,
  status ENUM('draft', 'approved', 'converted', 'cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by_id) REFERENCES contact(contact_id)
);

-- Material Request Items
CREATE TABLE IF NOT EXISTS material_request_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mr_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  qty DECIMAL(10,2),
  uom VARCHAR(50),
  purpose VARCHAR(255),
  FOREIGN KEY (mr_id) REFERENCES material_request(mr_id),
  FOREIGN KEY (item_code) REFERENCES item(item_code)
);

-- Request for Quotation (RFQ)
CREATE TABLE IF NOT EXISTS rfq (
  rfq_id VARCHAR(50) PRIMARY KEY,
  created_by_id VARCHAR(50),
  created_date DATE,
  valid_till DATE,
  status ENUM('draft', 'sent', 'responses_received', 'closed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_id) REFERENCES contact(contact_id)
);

-- RFQ Suppliers
CREATE TABLE IF NOT EXISTS rfq_supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfq_id VARCHAR(50) NOT NULL,
  supplier_id VARCHAR(50) NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfq(rfq_id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id)
);

-- RFQ Items
CREATE TABLE IF NOT EXISTS rfq_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfq_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  qty DECIMAL(10,2),
  uom VARCHAR(50),
  FOREIGN KEY (rfq_id) REFERENCES rfq(rfq_id),
  FOREIGN KEY (item_code) REFERENCES item(item_code)
);

-- Supplier Quotations
CREATE TABLE IF NOT EXISTS supplier_quotation (
  supplier_quotation_id VARCHAR(50) PRIMARY KEY,
  supplier_id VARCHAR(50) NOT NULL,
  rfq_id VARCHAR(50),
  quote_date DATE DEFAULT CURDATE(),
  status ENUM('draft', 'received', 'evaluated', 'accepted', 'rejected') DEFAULT 'draft',
  total_value DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (rfq_id) REFERENCES rfq(rfq_id)
);

-- Supplier Quotation Items
CREATE TABLE IF NOT EXISTS supplier_quotation_item (
  sq_item_id VARCHAR(50) PRIMARY KEY,
  supplier_quotation_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  rate DECIMAL(15,2),
  lead_time_days INT,
  min_qty DECIMAL(15,3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_quotation_id) REFERENCES supplier_quotation(supplier_quotation_id),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  INDEX idx_sq (supplier_quotation_id)
);

-- Taxes and Charges Template
CREATE TABLE IF NOT EXISTS taxes_and_charges_template (
  template_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Taxes and Charges Items
CREATE TABLE IF NOT EXISTS tax_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id VARCHAR(50) NOT NULL,
  tax_head VARCHAR(100),
  rate DECIMAL(5,2),
  FOREIGN KEY (template_id) REFERENCES taxes_and_charges_template(template_id)
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_order (
  po_no VARCHAR(50) PRIMARY KEY,
  supplier_id VARCHAR(50) NOT NULL,
  order_date DATE,
  expected_date DATE,
  currency VARCHAR(10) DEFAULT 'INR',
  taxes_and_charges_template_id VARCHAR(50),
  total_value DECIMAL(15,2),
  status ENUM('draft', 'submitted', 'to_receive', 'partially_received', 'completed', 'cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (taxes_and_charges_template_id) REFERENCES taxes_and_charges_template(template_id)
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  po_no VARCHAR(50) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  qty DECIMAL(10,2),
  uom VARCHAR(50),
  rate DECIMAL(10,2),
  schedule_date DATE,
  received_qty DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (po_no) REFERENCES purchase_order(po_no),
  FOREIGN KEY (item_code) REFERENCES item(item_code)
);

-- Purchase Receipts (GRN)
CREATE TABLE IF NOT EXISTS purchase_receipt (
  grn_no VARCHAR(50) PRIMARY KEY,
  po_no VARCHAR(50) NOT NULL,
  supplier_id VARCHAR(50) NOT NULL,
  receipt_date DATE,
  status ENUM('draft', 'submitted', 'inspected', 'accepted', 'rejected') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (po_no) REFERENCES purchase_order(po_no),
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id)
);

-- Purchase Receipt Items
CREATE TABLE IF NOT EXISTS purchase_receipt_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grn_no VARCHAR(50) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  received_qty DECIMAL(10,2),
  accepted_qty DECIMAL(10,2),
  rejected_qty DECIMAL(10,2),
  warehouse_code VARCHAR(50),
  batch_no VARCHAR(100),
  quality_inspection_required BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (grn_no) REFERENCES purchase_receipt(grn_no),
  FOREIGN KEY (item_code) REFERENCES item(item_code)
);

-- Purchase Invoices
CREATE TABLE IF NOT EXISTS purchase_invoice (
  purchase_invoice_no VARCHAR(50) PRIMARY KEY,
  supplier_id VARCHAR(50) NOT NULL,
  po_no VARCHAR(50),
  grn_no VARCHAR(50),
  invoice_date DATE,
  due_date DATE,
  net_amount DECIMAL(15,2),
  status ENUM('draft', 'submitted', 'paid', 'cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (po_no) REFERENCES purchase_order(po_no),
  FOREIGN KEY (grn_no) REFERENCES purchase_receipt(grn_no)
);

-- Purchase Invoice Items
CREATE TABLE IF NOT EXISTS purchase_invoice_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_invoice_no VARCHAR(50) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  qty DECIMAL(10,2),
  rate DECIMAL(10,2),
  FOREIGN KEY (purchase_invoice_no) REFERENCES purchase_invoice(purchase_invoice_no),
  FOREIGN KEY (item_code) REFERENCES item(item_code)
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouse (
  warehouse_code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

-- Stock (Inventory)
CREATE TABLE IF NOT EXISTS stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_code VARCHAR(100) NOT NULL,
  warehouse_code VARCHAR(50) NOT NULL,
  qty DECIMAL(10,2) DEFAULT 0,
  min_qty DECIMAL(10,2),
  max_qty DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  FOREIGN KEY (warehouse_code) REFERENCES warehouse(warehouse_code),
  UNIQUE KEY unique_item_warehouse (item_code, warehouse_code)
);

-- Create indexes for performance
CREATE INDEX idx_supplier_active ON supplier(is_active);
CREATE INDEX idx_po_status ON purchase_order(status);
CREATE INDEX idx_grn_status ON purchase_receipt(status);
CREATE INDEX idx_stock_item ON stock(item_code);
