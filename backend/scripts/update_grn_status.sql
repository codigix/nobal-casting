ALTER TABLE grn_requests MODIFY status ENUM('pending', 'inspecting', 'awaiting_inventory_approval', 'approved', 'rejected', 'sent_back') DEFAULT 'pending';
