-- ============================================================================
-- PRODUCTION PLAN - MATERIAL STATUS TRACKING
-- ============================================================================
-- Add material_status and mr_id columns to track Material Request approval

USE nobalcasting;

-- Add columns to production_plan_raw_material
ALTER TABLE production_plan_raw_material ADD COLUMN IF NOT EXISTS mr_id VARCHAR(100);
ALTER TABLE production_plan_raw_material ADD COLUMN IF NOT EXISTS material_status VARCHAR(50) DEFAULT 'pending';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_plan_raw_material_mr_id ON production_plan_raw_material(mr_id);
CREATE INDEX IF NOT EXISTS idx_plan_raw_material_status ON production_plan_raw_material(material_status);

-- Statuses:
-- 'pending' - Material request not yet created
-- 'requested' - Material request created but not approved
-- 'approved' - Material request approved
-- 'completed' - Material received/issued

SELECT 'Production Plan Material Status Tracking Added Successfully' as status;
