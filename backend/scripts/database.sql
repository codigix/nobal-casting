-- Aluminium Precision Casting ERP Database Schema
-- MySQL database creation and table structure

CREATE DATABASE IF NOT EXISTS aluminium_erp;
USE aluminium_erp;

-- ===== CORE MASTER TABLES =====

-- Company Information
CREATE TABLE IF NOT EXISTS company (
  company_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  country VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'INR',
  fiscal_year_start DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== BUYING MODULE =====

-- Supplier Groups
CREATE TABLE IF NOT EXISTS supplier_group (
  name VARCHAR(100) PRIMARY KEY,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contacts
CREATE TABLE IF NOT EXISTS contact (
  contact_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  role VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Address
CREATE TABLE IF NOT EXISTS address (
  address_id VARCHAR(50) PRIMARY KEY,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE IF NOT EXISTS supplier (
  supplier_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  supplier_group VARCHAR(100),
  gstin VARCHAR(50),
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
  FOREIGN KEY (contact_person_id) REFERENCES contact(contact_id),
  FOREIGN KEY (address_id) REFERENCES address(address_id),
  INDEX idx_name (name),
  INDEX idx_gstin (gstin)
);

-- Link Contact to Supplier
CREATE TABLE IF NOT EXISTS supplier_contact (
  supplier_id VARCHAR(50),
  contact_id VARCHAR(50),
  PRIMARY KEY (supplier_id, contact_id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (contact_id) REFERENCES contact(contact_id)
);

-- Link Address to Supplier
CREATE TABLE IF NOT EXISTS supplier_address (
  supplier_id VARCHAR(50),
  address_id VARCHAR(50),
  PRIMARY KEY (supplier_id, address_id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (address_id) REFERENCES address(address_id)
);

-- Supplier Scorecard
CREATE TABLE IF NOT EXISTS supplier_scorecard (
  scorecard_id VARCHAR(50) PRIMARY KEY,
  supplier_id VARCHAR(50) NOT NULL,
  quality_score DECIMAL(5,2),
  delivery_score DECIMAL(5,2),
  cost_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  last_evaluated_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  INDEX idx_supplier (supplier_id)
);

-- Items/Products
CREATE TABLE IF NOT EXISTS item (
  item_code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  item_group VARCHAR(100),
  description TEXT,
  uom VARCHAR(10),
  hsn_code VARCHAR(20),
  gst_rate DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Material Request
CREATE TABLE IF NOT EXISTS material_request (
  mr_id VARCHAR(50) PRIMARY KEY,
  requested_by_id VARCHAR(50),
  department VARCHAR(100),
  request_date DATE DEFAULT CURDATE(),
  required_by_date DATE,
  status ENUM('draft', 'approved', 'converted', 'cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requested_by_id) REFERENCES contact(contact_id),
  INDEX idx_status (status)
);

-- Material Request Items
CREATE TABLE IF NOT EXISTS material_request_item (
  mr_item_id VARCHAR(50) PRIMARY KEY,
  mr_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  qty DECIMAL(15,3),
  uom VARCHAR(10),
  purpose TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mr_id) REFERENCES material_request(mr_id),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  INDEX idx_mr (mr_id)
);

-- Request for Quotation (RFQ)
CREATE TABLE IF NOT EXISTS rfq (
  rfq_id VARCHAR(50) PRIMARY KEY,
  created_by_id VARCHAR(50),
  created_date DATE DEFAULT CURDATE(),
  valid_till DATE,
  status ENUM('draft', 'sent', 'responses_received', 'closed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_id) REFERENCES contact(contact_id),
  INDEX idx_status (status)
);

-- RFQ Suppliers
CREATE TABLE IF NOT EXISTS rfq_supplier (
  rfq_supplier_id VARCHAR(50) PRIMARY KEY,
  rfq_id VARCHAR(50) NOT NULL,
  supplier_id VARCHAR(50) NOT NULL,
  status ENUM('draft', 'sent', 'responded', 'rejected') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rfq_id) REFERENCES rfq(rfq_id),
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  INDEX idx_rfq (rfq_id)
);

-- RFQ Items
CREATE TABLE IF NOT EXISTS rfq_item (
  rfq_item_id VARCHAR(50) PRIMARY KEY,
  rfq_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  qty DECIMAL(15,3),
  uom VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rfq_id) REFERENCES rfq(rfq_id),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  INDEX idx_rfq (rfq_id)
);

-- Supplier Quotation
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
  FOREIGN KEY (rfq_id) REFERENCES rfq(rfq_id),
  INDEX idx_supplier (supplier_id),
  INDEX idx_rfq (rfq_id)
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
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tax Items
CREATE TABLE IF NOT EXISTS tax_item (
  tax_item_id VARCHAR(50) PRIMARY KEY,
  template_id VARCHAR(50) NOT NULL,
  tax_head VARCHAR(100),
  rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES taxes_and_charges_template(template_id),
  INDEX idx_template (template_id)
);

-- Purchase Order
CREATE TABLE IF NOT EXISTS purchase_order (
  po_no VARCHAR(50) PRIMARY KEY,
  supplier_id VARCHAR(50) NOT NULL,
  order_date DATE DEFAULT CURDATE(),
  expected_date DATE,
  currency VARCHAR(10) DEFAULT 'INR',
  tax_template_id VARCHAR(50),
  taxes_amount DECIMAL(15,2) DEFAULT 0,
  total_value DECIMAL(15,2),
  status ENUM('draft', 'submitted', 'to_receive', 'partially_received', 'completed', 'cancelled') DEFAULT 'draft',
  created_by_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (tax_template_id) REFERENCES taxes_and_charges_template(template_id),
  FOREIGN KEY (created_by_id) REFERENCES contact(contact_id),
  INDEX idx_supplier (supplier_id),
  INDEX idx_status (status),
  INDEX idx_order_date (order_date)
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_item (
  po_item_id VARCHAR(50) PRIMARY KEY,
  po_no VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  qty DECIMAL(15,3),
  uom VARCHAR(10),
  rate DECIMAL(15,2),
  schedule_date DATE,
  received_qty DECIMAL(15,3) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (po_no) REFERENCES purchase_order(po_no),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  INDEX idx_po (po_no)
);

-- Warehouse
CREATE TABLE IF NOT EXISTS warehouse (
  warehouse_code VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address_id VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (address_id) REFERENCES address(address_id)
);

-- Purchase Receipt (GRN)
CREATE TABLE IF NOT EXISTS purchase_receipt (
  grn_no VARCHAR(50) PRIMARY KEY,
  po_no VARCHAR(50),
  supplier_id VARCHAR(50) NOT NULL,
  receipt_date DATE DEFAULT CURDATE(),
  status ENUM('draft', 'submitted', 'inspected', 'accepted', 'rejected') DEFAULT 'draft',
  total_received_qty DECIMAL(15,3),
  created_by_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (po_no) REFERENCES purchase_order(po_no),
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (created_by_id) REFERENCES contact(contact_id),
  INDEX idx_po (po_no),
  INDEX idx_supplier (supplier_id),
  INDEX idx_status (status)
);

-- Purchase Receipt Items
CREATE TABLE IF NOT EXISTS purchase_receipt_item (
  grn_item_id VARCHAR(50) PRIMARY KEY,
  grn_no VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  received_qty DECIMAL(15,3),
  accepted_qty DECIMAL(15,3),
  rejected_qty DECIMAL(15,3),
  warehouse_code VARCHAR(50),
  batch_no VARCHAR(100),
  quality_inspection_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (grn_no) REFERENCES purchase_receipt(grn_no),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  FOREIGN KEY (warehouse_code) REFERENCES warehouse(warehouse_code),
  INDEX idx_grn (grn_no)
);

-- Purchase Invoice
CREATE TABLE IF NOT EXISTS purchase_invoice (
  purchase_invoice_no VARCHAR(50) PRIMARY KEY,
  supplier_id VARCHAR(50) NOT NULL,
  po_no VARCHAR(50),
  grn_no VARCHAR(50),
  invoice_date DATE DEFAULT CURDATE(),
  due_date DATE,
  tax_template_id VARCHAR(50),
  taxes_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2),
  status ENUM('draft', 'submitted', 'paid', 'cancelled') DEFAULT 'draft',
  created_by_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(supplier_id),
  FOREIGN KEY (po_no) REFERENCES purchase_order(po_no),
  FOREIGN KEY (grn_no) REFERENCES purchase_receipt(grn_no),
  FOREIGN KEY (tax_template_id) REFERENCES taxes_and_charges_template(template_id),
  FOREIGN KEY (created_by_id) REFERENCES contact(contact_id),
  INDEX idx_supplier (supplier_id),
  INDEX idx_status (status),
  INDEX idx_invoice_date (invoice_date)
);

-- Purchase Invoice Items
CREATE TABLE IF NOT EXISTS purchase_invoice_item (
  invoice_item_id VARCHAR(50) PRIMARY KEY,
  purchase_invoice_no VARCHAR(50) NOT NULL,
  item_code VARCHAR(50) NOT NULL,
  qty DECIMAL(15,3),
  rate DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (purchase_invoice_no) REFERENCES purchase_invoice(purchase_invoice_no),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  INDEX idx_invoice (purchase_invoice_no)
);

-- ===== STOCK MODULE =====

-- Stock
CREATE TABLE IF NOT EXISTS stock (
  stock_id VARCHAR(50) PRIMARY KEY,
  item_code VARCHAR(50) NOT NULL,
  warehouse_code VARCHAR(50) NOT NULL,
  qty_on_hand DECIMAL(15,3),
  qty_reserved DECIMAL(15,3) DEFAULT 0,
  qty_available DECIMAL(15,3),
  valuation_rate DECIMAL(15,2),
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_item_warehouse (item_code, warehouse_code),
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  FOREIGN KEY (warehouse_code) REFERENCES warehouse(warehouse_code),
  INDEX idx_item (item_code)
);

-- Stock Ledger
CREATE TABLE IF NOT EXISTS stock_ledger (
  ledger_id VARCHAR(50) PRIMARY KEY,
  item_code VARCHAR(50) NOT NULL,
  warehouse_code VARCHAR(50),
  voucher_type VARCHAR(50),
  voucher_no VARCHAR(50),
  qty_change DECIMAL(15,3),
  valuation_rate DECIMAL(15,2),
  posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_code) REFERENCES item(item_code),
  FOREIGN KEY (warehouse_code) REFERENCES warehouse(warehouse_code),
  INDEX idx_item (item_code),
  INDEX idx_posted_date (posted_date)
);

-- ===== CREATE INDEXES FOR PERFORMANCE =====

CREATE INDEX idx_supplier_name ON supplier(name);
CREATE INDEX idx_item_code ON item(item_code);
CREATE INDEX idx_po_date ON purchase_order(order_date);
CREATE INDEX idx_grn_date ON purchase_receipt(receipt_date);
CREATE INDEX idx_invoice_date_supplier ON purchase_invoice(supplier_id, invoice_date);