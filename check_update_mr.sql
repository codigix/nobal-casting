USE nobalcasting;

-- Check current state
SELECT mr_id, department, purpose, status FROM material_request WHERE mr_id = 'MR-1767614641317';

-- Update purpose to material_issue for Production department
UPDATE material_request 
SET purpose = 'material_issue' 
WHERE mr_id = 'MR-1767614641317' AND department = 'Production';

-- Verify update
SELECT mr_id, department, purpose, status FROM material_request WHERE mr_id = 'MR-1767614641317';
