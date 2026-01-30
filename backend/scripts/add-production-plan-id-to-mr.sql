-- Migration to add production_plan_id to material_request
USE nobalcasting;

ALTER TABLE material_request ADD COLUMN production_plan_id VARCHAR(100) NULL AFTER mr_id;
CREATE INDEX idx_material_request_plan_id ON material_request(production_plan_id);
