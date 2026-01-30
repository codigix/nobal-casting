-- Add setup_time to bom_operation table
ALTER TABLE bom_operation ADD COLUMN setup_time DECIMAL(10,2) DEFAULT 0 AFTER operation_time;

-- Add selling_rate to bom table
ALTER TABLE bom ADD COLUMN selling_rate DECIMAL(15,2) DEFAULT 0 AFTER total_cost;
