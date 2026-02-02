ALTER TABLE material_request_item ADD COLUMN issued_qty DECIMAL(15,3) DEFAULT 0 AFTER qty;
ALTER TABLE material_request_item ADD COLUMN status ENUM('pending', 'partial', 'completed') DEFAULT 'pending' AFTER issued_qty;
