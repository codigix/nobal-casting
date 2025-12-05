-- ============================================
-- DEPARTMENT-WISE ERP ENHANCEMENT
-- ============================================
-- This script adds all missing departments and their tables

USE aluminium_erp;

-- ============================================
-- UPDATE USERS TABLE - ADD DEPARTMENT & ROLE
-- ============================================

-- Add columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'buying';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('admin', 'manager', 'executive', 'staff') DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_department (department);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_role (role);

-- ============================================
-- 1. PRODUCTION PLANNING & CONTROL TABLES
-- ============================================

-- Machine Master
CREATE TABLE IF NOT EXISTS machine_master (
  machine_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  model VARCHAR(100),
  capacity INT,
  status ENUM('active', 'inactive', 'maintenance', 'retired') DEFAULT 'active',
  purchase_date DATE,
  cost DECIMAL(15,2),
  maintenance_interval INT,
  last_maintenance_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status)
);

-- Operator Master
CREATE TABLE IF NOT EXISTS operator_master (
  operator_id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  qualification VARCHAR(255),
  experience_years INT,
  machines_skilled_on TEXT,
  status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status)
);

-- Sales Orders (Selling Module)
CREATE TABLE IF NOT EXISTS sales_order (
  sales_order_id VARCHAR(50) PRIMARY KEY,
  so_id VARCHAR(50) UNIQUE,
  customer_id VARCHAR(50),
  customer_name VARCHAR(255),
  quotation_id VARCHAR(50),
  order_date DATE,
  delivery_date DATE,
  total_value DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  grand_total DECIMAL(15,2),
  status ENUM('draft', 'confirmed', 'dispatched', 'invoiced', 'cancelled') DEFAULT 'draft',
  notes TEXT,
  created_by_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_so_id (so_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_order_date (order_date),
  INDEX idx_status (status)
);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_order (
  wo_id VARCHAR(50) PRIMARY KEY,
  sales_order_id VARCHAR(50),
  item_code VARCHAR(100),
  quantity INT,
  unit_cost DECIMAL(15,2),
  total_cost DECIMAL(15,2),
  required_date DATE,
  status ENUM('draft', 'approved', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
  assigned_to_id VARCHAR(50),
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_so_id (sales_order_id),
  INDEX idx_item_code (item_code)
);

-- Production Plans
CREATE TABLE IF NOT EXISTS production_plan (
  plan_id VARCHAR(50) PRIMARY KEY,
  plan_date DATE,
  week_number INT,
  planned_by_id VARCHAR(50),
  status ENUM('draft', 'approved', 'in_progress', 'completed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plan_date (plan_date),
  INDEX idx_status (status)
);

-- Production Plan Items
CREATE TABLE IF NOT EXISTS production_plan_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(50) NOT NULL,
  work_order_id VARCHAR(50),
  machine_id VARCHAR(50),
  operator_id VARCHAR(50),
  scheduled_date DATE,
  shift_no INT,
  planned_quantity INT,
  estimated_hours DECIMAL(8,2),
  FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id),
  FOREIGN KEY (work_order_id) REFERENCES work_order(wo_id),
  FOREIGN KEY (machine_id) REFERENCES machine_master(machine_id),
  FOREIGN KEY (operator_id) REFERENCES operator_master(operator_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_scheduled_date (scheduled_date)
);

-- Production Entries (Daily Production)
CREATE TABLE IF NOT EXISTS production_entry (
  entry_id VARCHAR(50) PRIMARY KEY,
  work_order_id VARCHAR(50) NOT NULL,
  machine_id VARCHAR(50),
  operator_id VARCHAR(50),
  entry_date DATE,
  shift_no INT,
  quantity_produced INT,
  quantity_rejected INT,
  hours_worked DECIMAL(8,2),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_order(wo_id),
  FOREIGN KEY (machine_id) REFERENCES machine_master(machine_id),
  FOREIGN KEY (operator_id) REFERENCES operator_master(operator_id),
  INDEX idx_entry_date (entry_date),
  INDEX idx_wo_id (work_order_id)
);

-- Production Rejections
CREATE TABLE IF NOT EXISTS production_rejection (
  rejection_id VARCHAR(50) PRIMARY KEY,
  production_entry_id VARCHAR(50) NOT NULL,
  rejection_reason VARCHAR(255),
  rejection_count INT,
  root_cause TEXT,
  corrective_action TEXT,
  reported_by_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (production_entry_id) REFERENCES production_entry(entry_id),
  INDEX idx_entry_id (production_entry_id)
);

-- ============================================
-- 2. TOOL ROOM / DIE MAINTENANCE TABLES
-- ============================================

-- Tool Master
CREATE TABLE IF NOT EXISTS tool_master (
  tool_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tool_type VARCHAR(100),
  item_code VARCHAR(100),
  location VARCHAR(255),
  status ENUM('active', 'inactive', 'in_rework', 'retired') DEFAULT 'active',
  purchase_date DATE,
  cost DECIMAL(15,2),
  last_used_date DATE,
  life_span_hours INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_item_code (item_code)
);

-- Die Register
CREATE TABLE IF NOT EXISTS die_register (
  die_id VARCHAR(50) PRIMARY KEY,
  tool_id VARCHAR(50),
  drawing_number VARCHAR(100),
  supplier_id VARCHAR(50),
  purchase_date DATE,
  purchase_cost DECIMAL(15,2),
  expected_life INT,
  cavities INT,
  material VARCHAR(100),
  status ENUM('new', 'active', 'in_rework', 'retired') DEFAULT 'active',
  work_order_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tool_master(tool_id),
  INDEX idx_status (status)
);

-- Die Rework Log
CREATE TABLE IF NOT EXISTS die_rework_log (
  rework_id VARCHAR(50) PRIMARY KEY,
  die_id VARCHAR(50) NOT NULL,
  rework_date DATE,
  rework_type VARCHAR(100),
  reason TEXT,
  cost DECIMAL(15,2),
  vendor_id VARCHAR(50),
  downtime_hours INT,
  completed_date DATE,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (die_id) REFERENCES die_register(die_id),
  INDEX idx_status (status),
  INDEX idx_rework_date (rework_date)
);

-- Maintenance Schedule
CREATE TABLE IF NOT EXISTS maintenance_schedule (
  schedule_id VARCHAR(50) PRIMARY KEY,
  tool_id VARCHAR(50) NOT NULL,
  maintenance_type VARCHAR(100),
  scheduled_date DATE,
  interval_days INT,
  estimated_duration_hours DECIMAL(8,2),
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tool_master(tool_id),
  INDEX idx_scheduled_date (scheduled_date),
  INDEX idx_status (status)
);

-- Maintenance History
CREATE TABLE IF NOT EXISTS maintenance_history (
  history_id VARCHAR(50) PRIMARY KEY,
  schedule_id VARCHAR(50),
  tool_id VARCHAR(50) NOT NULL,
  maintenance_date DATE,
  maintenance_type VARCHAR(100),
  performed_by_id VARCHAR(50),
  duration_hours DECIMAL(8,2),
  cost DECIMAL(15,2),
  observations TEXT,
  next_maintenance_due DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tool_master(tool_id),
  INDEX idx_maintenance_date (maintenance_date)
);

-- ============================================
-- 3. QUALITY CONTROL (QC) TABLES
-- ============================================

-- Inspection Checklist
CREATE TABLE IF NOT EXISTS inspection_checklist (
  checklist_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  inspection_type VARCHAR(100),
  parameters TEXT,
  acceptance_criteria TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_type (inspection_type)
);

-- Inspection Results
CREATE TABLE IF NOT EXISTS inspection_result (
  inspection_id VARCHAR(50) PRIMARY KEY,
  reference_type VARCHAR(50),
  reference_id VARCHAR(50),
  checklist_id VARCHAR(50),
  inspection_date DATE,
  inspector_id VARCHAR(50),
  quantity_inspected INT,
  quantity_passed INT,
  quantity_rejected INT,
  result ENUM('pass', 'fail', 'conditional') DEFAULT 'pass',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES inspection_checklist(checklist_id),
  INDEX idx_date (inspection_date),
  INDEX idx_result (result)
);

-- Rejection Reasons
CREATE TABLE IF NOT EXISTS rejection_reason (
  reason_id VARCHAR(50) PRIMARY KEY,
  inspection_id VARCHAR(50),
  reason_type VARCHAR(100),
  reason_description TEXT,
  quantity INT,
  severity ENUM('minor', 'major', 'critical') DEFAULT 'major',
  rework_possible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspection_id) REFERENCES inspection_result(inspection_id),
  INDEX idx_severity (severity)
);

-- Customer Complaints
CREATE TABLE IF NOT EXISTS customer_complaint (
  complaint_id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50),
  complaint_date DATE,
  complaint_type VARCHAR(100),
  description TEXT,
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  assigned_to_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_complaint_date (complaint_date)
);

-- CAPA (Corrective and Preventive Action)
CREATE TABLE IF NOT EXISTS capa_action (
  capa_id VARCHAR(50) PRIMARY KEY,
  complaint_id VARCHAR(50),
  inspection_id VARCHAR(50),
  action_type ENUM('corrective', 'preventive') DEFAULT 'corrective',
  root_cause TEXT,
  proposed_action TEXT,
  responsible_person_id VARCHAR(50),
  target_date DATE,
  completion_date DATE,
  status ENUM('open', 'in_progress', 'completed', 'verified') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES customer_complaint(complaint_id),
  FOREIGN KEY (inspection_id) REFERENCES inspection_result(inspection_id),
  INDEX idx_status (status)
);

-- ============================================
-- 4. DISPATCH / LOGISTICS TABLES
-- ============================================

-- Dispatch Orders
CREATE TABLE IF NOT EXISTS dispatch_order (
  dispatch_id VARCHAR(50) PRIMARY KEY,
  sales_order_id VARCHAR(50),
  dispatch_date DATE,
  expected_delivery_date DATE,
  shipped_date DATE,
  status ENUM('pending', 'ready', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  shipping_address TEXT,
  tracking_number VARCHAR(100),
  carrier VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_dispatch_date (dispatch_date)
);

-- Dispatch Items
CREATE TABLE IF NOT EXISTS dispatch_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dispatch_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(100),
  quantity INT,
  packed_quantity INT,
  batch_number VARCHAR(100),
  FOREIGN KEY (dispatch_id) REFERENCES dispatch_order(dispatch_id),
  INDEX idx_dispatch_id (dispatch_id)
);

-- Delivery Challans
CREATE TABLE IF NOT EXISTS delivery_challan (
  challan_id VARCHAR(50) PRIMARY KEY,
  dispatch_id VARCHAR(50),
  challan_date DATE,
  status ENUM('generated', 'printed', 'delivered') DEFAULT 'generated',
  signed_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispatch_id) REFERENCES dispatch_order(dispatch_id),
  INDEX idx_challan_date (challan_date)
);

-- Shipment Tracking
CREATE TABLE IF NOT EXISTS shipment_tracking (
  tracking_id VARCHAR(50) PRIMARY KEY,
  dispatch_id VARCHAR(50),
  current_location VARCHAR(255),
  status VARCHAR(100),
  update_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispatch_id) REFERENCES dispatch_order(dispatch_id),
  INDEX idx_update_date (update_date)
);

-- ============================================
-- 5. ACCOUNTS / FINANCE TABLES
-- ============================================

-- Account Ledger
CREATE TABLE IF NOT EXISTS account_ledger (
  entry_id VARCHAR(50) PRIMARY KEY,
  transaction_date DATE,
  account_type ENUM('vendor', 'customer', 'expense', 'income') DEFAULT 'expense',
  account_id VARCHAR(50),
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  reference_doctype VARCHAR(50),
  reference_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (transaction_date),
  INDEX idx_account_type (account_type)
);

-- Vendor Payments
CREATE TABLE IF NOT EXISTS vendor_payment (
  payment_id VARCHAR(50) PRIMARY KEY,
  vendor_id VARCHAR(50),
  purchase_order_id VARCHAR(50),
  payment_date DATE,
  amount DECIMAL(15,2),
  payment_method ENUM('cash', 'check', 'transfer', 'credit') DEFAULT 'transfer',
  payment_reference VARCHAR(100),
  status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date)
);

-- Customer Payments
CREATE TABLE IF NOT EXISTS customer_payment (
  payment_id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50),
  sales_order_id VARCHAR(50),
  payment_date DATE,
  amount DECIMAL(15,2),
  payment_method ENUM('cash', 'check', 'transfer', 'credit') DEFAULT 'transfer',
  payment_reference VARCHAR(100),
  status ENUM('pending', 'approved', 'received', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_payment_date (payment_date)
);

-- Expense Master
CREATE TABLE IF NOT EXISTS expense_master (
  expense_id VARCHAR(50) PRIMARY KEY,
  expense_date DATE,
  category VARCHAR(100),
  description TEXT,
  amount DECIMAL(15,2),
  department VARCHAR(100),
  expense_type ENUM('travel', 'material', 'utility', 'maintenance', 'other') DEFAULT 'other',
  payment_method VARCHAR(50),
  status ENUM('draft', 'submitted', 'approved', 'paid') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_category (category)
);

-- Costing Report
CREATE TABLE IF NOT EXISTS costing_report (
  report_id VARCHAR(50) PRIMARY KEY,
  work_order_id VARCHAR(50),
  item_code VARCHAR(100),
  raw_material_cost DECIMAL(15,2),
  labour_cost DECIMAL(15,2),
  overhead_cost DECIMAL(15,2),
  total_cost DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  variance DECIMAL(15,2),
  variance_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_work_order_id (work_order_id)
);

-- ============================================
-- 6. HR & PAYROLL TABLES
-- ============================================

-- Employee Master
CREATE TABLE IF NOT EXISTS employee_master (
  employee_id VARCHAR(50) PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other') DEFAULT 'male',
  department VARCHAR(100),
  designation VARCHAR(100),
  joining_date DATE,
  status ENUM('active', 'inactive', 'on_leave', 'terminated') DEFAULT 'active',
  salary DECIMAL(15,2),
  bank_account VARCHAR(50),
  uan_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_status (status)
);

-- Attendance Log
CREATE TABLE IF NOT EXISTS attendance_log (
  attendance_id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  attendance_date DATE,
  check_in_time TIME,
  check_out_time TIME,
  hours_worked DECIMAL(8,2),
  status ENUM('present', 'absent', 'leave', 'holiday') DEFAULT 'present',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employee_master(employee_id),
  INDEX idx_attendance_date (attendance_date),
  INDEX idx_employee_id (employee_id)
);

-- Shift Allocation
CREATE TABLE IF NOT EXISTS shift_allocation (
  allocation_id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  shift_no INT,
  shift_start_time TIME,
  shift_end_time TIME,
  allocation_date DATE,
  end_date DATE,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employee_master(employee_id),
  INDEX idx_allocation_date (allocation_date)
);

-- Payroll
CREATE TABLE IF NOT EXISTS payroll (
  payroll_id VARCHAR(50) PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  payroll_date DATE,
  basic_salary DECIMAL(15,2),
  allowances DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  gross_salary DECIMAL(15,2),
  net_salary DECIMAL(15,2),
  status ENUM('draft', 'submitted', 'approved', 'paid') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employee_master(employee_id),
  INDEX idx_payroll_date (payroll_date),
  INDEX idx_status (status)
);

-- ============================================
-- 7. AUDIT & ADMIN TABLES
-- ============================================

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  log_id VARCHAR(50) PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  table_name VARCHAR(100),
  record_id VARCHAR(50),
  old_values LONGTEXT,
  new_values LONGTEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_user_id (user_id)
);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  setting_id VARCHAR(100) PRIMARY KEY,
  setting_value LONGTEXT,
  setting_type VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Role Master
CREATE TABLE IF NOT EXISTS role_master (
  role_id VARCHAR(50) PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions LONGTEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Permission Matrix
CREATE TABLE IF NOT EXISTS permission_matrix (
  permission_id VARCHAR(50) PRIMARY KEY,
  role_id VARCHAR(50),
  module VARCHAR(100),
  action ENUM('create', 'read', 'update', 'delete', 'approve') DEFAULT 'read',
  is_allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES role_master(role_id),
  INDEX idx_role_id (role_id)
);

-- ============================================
-- INSERT DEFAULT ROLES
-- ============================================

INSERT IGNORE INTO role_master (role_id, role_name, description, is_active) VALUES
('role_admin', 'Administrator', 'Full system access with all permissions', TRUE),
('role_manager', 'Manager', 'Department manager with approval rights', TRUE),
('role_executive', 'Executive', 'Executive with reporting access', TRUE),
('role_staff', 'Staff', 'Regular staff member with limited access', TRUE);

-- ============================================
-- INSERT DEFAULT SETTINGS
-- ============================================

INSERT IGNORE INTO system_settings (setting_id, setting_value, setting_type, description) VALUES
('company_name', 'Aluminium Precision Casting', 'text', 'Company name'),
('company_email', 'info@aluminiumcasting.com', 'text', 'Company email'),
('company_phone', '+91-XXXXXXXXXX', 'text', 'Company phone'),
('fiscal_year_start', '01-04', 'text', 'Fiscal year start (MM-DD)'),
('default_currency', 'INR', 'text', 'Default currency'),
('auto_backup_enabled', 'true', 'boolean', 'Enable automatic backups'),
('backup_frequency', 'daily', 'text', 'Backup frequency');

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Composite indexes for common queries
CREATE INDEX idx_production_entry_date_machine ON production_entry(entry_date, machine_id);
CREATE INDEX idx_dispatch_order_status_date ON dispatch_order(status, dispatch_date);
CREATE INDEX idx_vendor_payment_status_date ON vendor_payment(status, payment_date);
CREATE INDEX idx_customer_payment_status_date ON customer_payment(status, payment_date);
CREATE INDEX idx_inspection_result_date_result ON inspection_result(inspection_date, result);
CREATE INDEX idx_employee_master_dept_status ON employee_master(department, status);

-- ============================================
-- SCHEMA MIGRATION COMPLETE
-- ============================================

COMMIT;
