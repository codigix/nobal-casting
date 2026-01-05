USE nobalcasting;
SELECT mr_id, department, purpose, status FROM material_request ORDER BY created_at DESC LIMIT 5;