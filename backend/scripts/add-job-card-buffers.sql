-- ============================================================================
-- JOB CARD WIP BUFFER SYSTEM
-- Supports Dependent and Parallel Sub-Assembly Flow
-- ============================================================================

SET FOREIGN_KEY_CHECKS=0;

-- Table to track quantity transfers between job cards/work orders
DROP TABLE IF EXISTS job_card_buffer;
CREATE TABLE job_card_buffer (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_card_id VARCHAR(50) COLLATE utf8mb4_0900_ai_ci NOT NULL,
  source_item_code VARCHAR(100) NOT NULL,
  source_job_card_id VARCHAR(50) COLLATE utf8mb4_0900_ai_ci,
  available_qty DECIMAL(18, 6) NOT NULL DEFAULT 0,
  consumed_qty DECIMAL(18, 6) NOT NULL DEFAULT 0,
  uom VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_job_card_id (job_card_id),
  INDEX idx_source_item (source_item_code),
  INDEX idx_source_job_card (source_job_card_id),
  CONSTRAINT fk_jcb_job_card FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add buffer columns to job_card for easy access and backward compatibility
ALTER TABLE job_card ADD COLUMN input_buffer_qty DECIMAL(18, 6) NOT NULL DEFAULT 0 AFTER planned_quantity;
ALTER TABLE job_card ADD COLUMN available_to_transfer DECIMAL(18, 6) NOT NULL DEFAULT 0 AFTER accepted_quantity;

-- Initialize input_buffer_qty for existing job cards (assume planned_quantity is available for already started ones)
-- This is a one-time migration for existing data
UPDATE job_card SET input_buffer_qty = planned_quantity WHERE status IN ('in-progress', 'completed') AND input_buffer_qty = 0;

SET FOREIGN_KEY_CHECKS=1;

SELECT 'Job Card WIP Buffer Tables Created Successfully' as status;
