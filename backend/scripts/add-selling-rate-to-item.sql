-- ============================================================================
-- ITEM TABLE - ADD SELLING RATE FIELD
-- ============================================================================
-- Add selling_rate column to track item selling price separate from standard_selling_rate

USE nobalcasting;

-- Add selling_rate column if it doesn't exist
ALTER TABLE item ADD COLUMN IF NOT EXISTS selling_rate DECIMAL(15,2) DEFAULT 0;

-- Create index for selling_rate lookups
CREATE INDEX IF NOT EXISTS idx_selling_rate ON item(selling_rate);

SELECT 'Selling Rate field added to item table successfully' as status;
