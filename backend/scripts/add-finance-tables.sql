-- Finance & Accounting Tables

USE nobalcasting;

-- Account Ledger
CREATE TABLE IF NOT EXISTS account_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id VARCHAR(50) UNIQUE NOT NULL,
  transaction_date DATETIME NOT NULL,
  account_type VARCHAR(100) NOT NULL,
  account_id VARCHAR(50) NOT NULL,
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  description TEXT,
  reference_doctype VARCHAR(50),
  reference_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_account (account_type, account_id)
);

-- Vendor Payments (Payables)
CREATE TABLE IF NOT EXISTS vendor_payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(50) UNIQUE NOT NULL,
  vendor_id VARCHAR(50) NOT NULL,
  purchase_order_id VARCHAR(50),
  payment_date DATETIME NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method ENUM('cash', 'check', 'transfer', 'other') DEFAULT 'transfer',
  payment_reference VARCHAR(100),
  status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_date (payment_date),
  INDEX idx_vendor (vendor_id),
  INDEX idx_status (status)
);

-- Customer Payments (Receivables)
CREATE TABLE IF NOT EXISTS customer_payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id VARCHAR(50) UNIQUE NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  sales_order_id VARCHAR(50),
  payment_date DATETIME NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  payment_method ENUM('cash', 'check', 'transfer', 'other') DEFAULT 'transfer',
  payment_reference VARCHAR(100),
  status ENUM('pending', 'received', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_date (payment_date),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status)
);

-- Expense Master
CREATE TABLE IF NOT EXISTS expense_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id VARCHAR(50) UNIQUE NOT NULL,
  expense_date DATETIME NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  department VARCHAR(100),
  expense_type ENUM('fixed', 'variable', 'other') DEFAULT 'variable',
  payment_method ENUM('cash', 'check', 'transfer', 'card') DEFAULT 'transfer',
  status ENUM('draft', 'approved', 'paid', 'cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expense_date (expense_date),
  INDEX idx_category (category),
  INDEX idx_status (status)
);
