-- ============================================
-- MATERIAL REQUEST & PURCHASE RECEIPT ENHANCEMENTS
-- ============================================
-- Phase 14: Add purpose-based workflow tracking and Material Request sourcing

USE nobalcasting;

-- ============================================
-- MATERIAL_REQUEST TABLE ALREADY HAS PURPOSE, SOURCE_WAREHOUSE, TARGET_WAREHOUSE
-- ============================================
-- Skipping material_request updates as they already exist

-- ============================================
-- 2. MODIFY PURCHASE_RECEIPT FOR MR SOURCING
-- ============================================

-- Make po_no nullable (allow NULL for MR-sourced receipts)
ALTER TABLE purchase_receipt MODIFY COLUMN po_no VARCHAR(50) NULL;

-- mr_id column already exists for tracking source Material Request

-- ============================================
-- 3. UPDATE MATERIAL_REQUEST_ITEM PURPOSE
-- ============================================

-- material_request_item purpose column handling (check if exists first)

-- ============================================
-- 4. CREATE INDEX FOR BETTER PERFORMANCE
-- ============================================

-- Create indexes (ignore if they already exist)
CREATE INDEX idx_material_request_purpose ON material_request(purpose, department);
CREATE INDEX idx_purchase_receipt_mr_id ON purchase_receipt(mr_id);
CREATE INDEX idx_purchase_receipt_po_status ON purchase_receipt(po_no, status);

-- ============================================
-- 5. VALIDATION TRIGGER (OPTIONAL)
-- ============================================

DELIMITER $$

DROP TRIGGER IF EXISTS validate_production_mr_purpose $$

CREATE TRIGGER validate_production_mr_purpose 
BEFORE INSERT ON material_request 
FOR EACH ROW 
BEGIN
  IF NEW.department = 'Production' AND NEW.purpose != 'material_issue' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 
      'Production department requests must have purpose = material_issue';
  END IF;
END$$

DROP TRIGGER IF EXISTS validate_production_mr_purpose_update $$

CREATE TRIGGER validate_production_mr_purpose_update 
BEFORE UPDATE ON material_request 
FOR EACH ROW 
BEGIN
  IF NEW.department = 'Production' AND NEW.purpose != 'material_issue' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 
      'Production department requests must have purpose = material_issue';
  END IF;
END$$

DELIMITER ;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
COMMIT;
