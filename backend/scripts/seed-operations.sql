-- Seed sample operations data
-- Run this after creating the operations table

INSERT INTO operation (name, operation_name, default_workstation, is_corrective_operation, status) VALUES
('sand_blasting', 'sand blasting', NULL, FALSE, 'active'),
('ENGRAVING', 'ENGRAVING', NULL, FALSE, 'active'),
('BUFFING', 'BUFFING', NULL, FALSE, 'active'),
('MACHINING_OP_40', 'MACHINING OP-40', NULL, FALSE, 'active'),
('MACHINING_OP_30', 'MACHINING OP-30', NULL, FALSE, 'active'),
('MACHINING_OP_20', 'MACHINING OP-20', NULL, FALSE, 'active'),
('MACHINING_OP_10', 'MACHINING OP-10', NULL, FALSE, 'active'),
('POWDER_COATING', 'POWDER COATING', NULL, FALSE, 'active'),
('HEAT_TREATMENT', 'HEAT TREATMENT', 'HEAT TREATMENT FURNACE', FALSE, 'active'),
('Shot_Blasting', 'Shot Blasting', NULL, FALSE, 'active'),
('Core_Preparation', 'Core Preparation', NULL, FALSE, 'active'),
('Assembly', 'Assembly', 'Welding Station - 01', FALSE, 'active'),
('Water_Leakage_Testing', 'Water Leakage Testing', 'WLT - Machine - 01', FALSE, 'active'),
('Fettling', 'Fettling', 'Line - 01', FALSE, 'active'),
('Final_Inspection', 'Final Inspection', 'Inspection Table - 01', FALSE, 'active'),
('Machining', 'Machining', NULL, FALSE, 'active'),
('GDC', 'GDC', NULL, FALSE, 'active');

-- Add sample sub-operations for some operations
INSERT INTO operation_sub_operation (operation_name, no, operation, operation_time) VALUES
('Assembly', 1, 'Component Preparation', 0.5),
('Assembly', 2, 'Welding', 2.0),
('Assembly', 3, 'Quality Check', 1.0),
('HEAT_TREATMENT', 1, 'Preheating', 1.0),
('HEAT_TREATMENT', 2, 'Heating', 3.0),
('HEAT_TREATMENT', 3, 'Cooling', 2.0),
('MACHINING_OP_40', 1, 'Rough Machining', 1.5),
('MACHINING_OP_40', 2, 'Fine Machining', 1.0),
('Fettling', 1, 'Grinding', 1.5),
('Fettling', 2, 'Polishing', 1.0),
('Final_Inspection', 1, 'Visual Inspection', 0.5),
('Final_Inspection', 2, 'Dimensional Check', 1.0),
('Final_Inspection', 3, 'Documentation', 0.5);
