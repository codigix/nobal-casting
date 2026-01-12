-- Add hourly_rate column to bom_operation table for operation cost calculation
-- Formula: Operation Cost = (Cycle Time in minutes ÷ 60) × Hourly Rate

ALTER TABLE bom_operation ADD COLUMN hourly_rate DECIMAL(15,2) DEFAULT 0 AFTER operation_time;

-- Update existing records to have a default hourly rate of 0
-- Operations can have their hourly rates set manually

-- Create an index for better query performance
CREATE INDEX idx_bom_operation_hourly_rate ON bom_operation(hourly_rate);
