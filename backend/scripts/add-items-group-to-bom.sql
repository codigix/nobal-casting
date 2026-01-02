-- Add items_group field to BOM table to classify BOMs as Finished Goods or Sub-Assemblies
ALTER TABLE bom ADD COLUMN items_group VARCHAR(50) DEFAULT 'Finished Goods' AFTER item_group;

-- Create index on items_group for better query performance
CREATE INDEX idx_bom_items_group ON bom(items_group);

-- Create index on item_code for faster BOM lookup
CREATE INDEX idx_bom_item_code ON bom(item_code);
