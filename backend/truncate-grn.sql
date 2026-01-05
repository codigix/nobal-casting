SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE grn_request_items;
TRUNCATE TABLE grn_requests;
SET FOREIGN_KEY_CHECKS = 1;
SELECT COUNT(*) as grn_requests_count FROM grn_requests;
SELECT COUNT(*) as grn_request_items_count FROM grn_request_items;
