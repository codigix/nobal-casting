-- Production Planning Header
CREATE TABLE IF NOT EXISTS production_plan (
  plan_id VARCHAR(100) PRIMARY KEY,
  naming_series VARCHAR(50),
  company VARCHAR(100),
  posting_date DATE NOT NULL,
  sales_order_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_posting_date (posting_date),
  INDEX idx_sales_order_id (sales_order_id)
);

-- Production Plan - Finished Goods Items
CREATE TABLE IF NOT EXISTS production_plan_fg (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(100) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255),
  bom_no VARCHAR(100),
  planned_qty DECIMAL(18,6) NOT NULL,
  uom VARCHAR(50),
  planned_start_date DATE,
  fg_warehouse VARCHAR(100),
  revision VARCHAR(50),
  material_grade VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
  INDEX idx_plan_id (plan_id),
  INDEX idx_item_code (item_code)
);

-- Production Plan - Sub-Assembly Items
CREATE TABLE IF NOT EXISTS production_plan_sub_assembly (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(100) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255),
  target_warehouse VARCHAR(100),
  schedule_date DATE,
  required_qty DECIMAL(18,6),
  manufacturing_type VARCHAR(50),
  bom_no VARCHAR(100),
  revision VARCHAR(50),
  material_grade VARCHAR(100),
  drawing_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
  INDEX idx_plan_id (plan_id),
  INDEX idx_item_code (item_code)
);

-- Production Plan - Raw Materials
CREATE TABLE IF NOT EXISTS production_plan_raw_material (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id VARCHAR(100) NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255),
  item_type VARCHAR(50),
  plan_to_request_qty DECIMAL(18,6),
  qty_as_per_bom DECIMAL(18,6),
  required_by DATE,
  bom_no VARCHAR(100),
  revision VARCHAR(50),
  material_grade VARCHAR(100),
  drawing_no VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
  INDEX idx_plan_id (plan_id),
  INDEX idx_item_code (item_code)
);
