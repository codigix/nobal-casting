SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE material_request_item;
TRUNCATE TABLE material_request;
SET FOREIGN_KEY_CHECKS = 1;
SELECT COUNT(*) as material_request_count FROM material_request;
SELECT COUNT(*) as material_request_item_count FROM material_request_item;
