-- ============================================================================
-- MATERIAL DEDUCTION FLOW TABLES
-- ============================================================================
-- Step 1: Material Allocation (when WO is created)
-- Step 2: Material Consumption (during job card execution)
-- Step 3: Stock Ledger Entry (when job card completes)

-- ============================================================================
-- TABLE 1: MATERIAL ALLOCATION
-- Tracks reserved/allocated materials for each work order
-- ============================================================================
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS material_allocation;
CREATE TABLE material_allocation (
  allocation_id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255),
  warehouse_id INT,
  warehouse_code VARCHAR(50),
  allocated_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
  consumed_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
  returned_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
  wasted_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
  status ENUM('pending', 'partial', 'completed', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_by VARCHAR(50),
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_work_order_id (work_order_id),
  INDEX idx_item_code (item_code),
  INDEX idx_status (status),
  INDEX idx_allocated_at (allocated_at),
  CONSTRAINT fk_ma_work_order FOREIGN KEY (work_order_id) REFERENCES work_order(wo_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- TABLE 2: JOB CARD MATERIAL CONSUMPTION
-- Tracks actual material consumption per job card/operation
-- ============================================================================
DROP TABLE IF EXISTS job_card_material_consumption;
CREATE TABLE job_card_material_consumption (
  consumption_id INT PRIMARY KEY AUTO_INCREMENT,
  job_card_id VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  work_order_id VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  item_code VARCHAR(100) NOT NULL,
  item_name VARCHAR(255),
  warehouse_id INT,
  warehouse_code VARCHAR(50),
  operation_name VARCHAR(255),
  planned_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
  consumed_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
  wasted_qty DECIMAL(12, 3) NOT NULL DEFAULT 0,
  waste_reason VARCHAR(255),
  status ENUM('pending', 'partial', 'completed') DEFAULT 'pending',
  notes TEXT,
  tracked_by VARCHAR(50),
  tracked_at DATETIME,
  
  INDEX idx_job_card_id (job_card_id),
  INDEX idx_work_order_id (work_order_id),
  INDEX idx_item_code (item_code),
  INDEX idx_tracked_at (tracked_at),
  CONSTRAINT fk_jcmc_job_card FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE,
  CONSTRAINT fk_jcmc_work_order FOREIGN KEY (work_order_id) REFERENCES work_order(wo_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- TABLE 3: MATERIAL DEDUCTION AUDIT LOG
-- Complete audit trail of all material deductions
-- ============================================================================
DROP TABLE IF EXISTS material_deduction_log;
CREATE TABLE material_deduction_log (
  log_id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  job_card_id VARCHAR(50) COLLATE utf8mb4_0900_ai_ci,
  item_code VARCHAR(100) NOT NULL,
  warehouse_id INT,
  transaction_type ENUM('allocate', 'consume', 'return', 'scrap') NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  before_qty DECIMAL(12, 3),
  after_qty DECIMAL(12, 3),
  reference_doc VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_work_order_id (work_order_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_mdl_work_order FOREIGN KEY (work_order_id) REFERENCES work_order(wo_id),
  CONSTRAINT fk_mdl_job_card FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- STOCK BALANCE COLUMNS (if they don't exist)
-- ============================================================================
-- Note: reserved_qty and available_qty should already exist from previous migrations

-- ============================================================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================================================
SET FOREIGN_KEY_CHECKS=1;

-- ============================================================================
-- VERIFY TABLES CREATION
-- ============================================================================
SELECT 'Material Deduction Flow Tables Created Successfully' as status;
