-- Add scrap/loss percentage to item table
ALTER TABLE item ADD COLUMN IF NOT EXISTS loss_percentage DECIMAL(5,2) DEFAULT 0;

-- Add scrap quantity to BOM line items
ALTER TABLE bom_line ADD COLUMN IF NOT EXISTS loss_percentage DECIMAL(5,2);
ALTER TABLE bom_line ADD COLUMN IF NOT EXISTS scrap_qty DECIMAL(18,6) DEFAULT 0;

-- Add indexes for better query performance
ALTER TABLE bom_line ADD INDEX IF NOT EXISTS idx_loss_percentage (loss_percentage);
