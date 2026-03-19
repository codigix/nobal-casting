-- Migration to add project_name to selling_sales_order
ALTER TABLE selling_sales_order ADD COLUMN project_name VARCHAR(255) AFTER quotation_id;

-- Log the migration
INSERT INTO migration_audit_log (migration_name) VALUES ('add-project-name-to-sales-order');
