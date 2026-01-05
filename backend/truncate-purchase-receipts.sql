SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE purchase_receipt_item;
TRUNCATE TABLE purchase_receipt;
SET FOREIGN_KEY_CHECKS = 1;
SELECT COUNT(*) as purchase_receipt_count FROM purchase_receipt;
SELECT COUNT(*) as purchase_receipt_item_count FROM purchase_receipt_item;
