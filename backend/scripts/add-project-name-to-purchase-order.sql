-- Migration to add project_name to purchase_order
ALTER TABLE purchase_order ADD COLUMN project_name VARCHAR(255) AFTER mr_id;

-- Log the migration
INSERT INTO migration_audit_log (migration_name) VALUES ('add-project-name-to-purchase-order');
