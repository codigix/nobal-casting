-- Add rate column to bom_line table for component costs
ALTER TABLE bom_line ADD COLUMN rate DECIMAL(15,2) DEFAULT 0 AFTER uom;

-- Add amount column for calculated amounts (qty * rate)
ALTER TABLE bom_line ADD COLUMN amount DECIMAL(18,6) DEFAULT 0 AFTER rate;

-- Create index for better query performance
CREATE INDEX idx_bom_line_rate ON bom_line(rate);
