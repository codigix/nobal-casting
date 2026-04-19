SET FOREIGN_KEY_CHECKS = 0;

-- Production & Manufacturing
TRUNCATE TABLE production_plan;
TRUNCATE TABLE production_plan_fg;
TRUNCATE TABLE production_plan_sub_assembly;
TRUNCATE TABLE production_plan_raw_material;
TRUNCATE TABLE production_plan_operations;
TRUNCATE TABLE work_order;
TRUNCATE TABLE work_order_operation;
TRUNCATE TABLE job_card;
TRUNCATE TABLE production_entry;
TRUNCATE TABLE time_log;
TRUNCATE TABLE downtime_entry;
TRUNCATE TABLE material_allocation;

-- Inventory & Stock
TRUNCATE TABLE material_request;
TRUNCATE TABLE material_request_item;
TRUNCATE TABLE stock;
TRUNCATE TABLE stock_balance;
TRUNCATE TABLE stock_ledger;
TRUNCATE TABLE stock_movements;
TRUNCATE TABLE purchase_receipt;
TRUNCATE TABLE purchase_receipt_item;
TRUNCATE TABLE purchase_order;
TRUNCATE TABLE purchase_order_item;
TRUNCATE TABLE purchase_invoice;
TRUNCATE TABLE purchase_invoice_item;
TRUNCATE TABLE rfq;
TRUNCATE TABLE rfq_item;
TRUNCATE TABLE rfq_supplier;
TRUNCATE TABLE supplier_quotation;
TRUNCATE TABLE supplier_quotation_item;
TRUNCATE TABLE manual_review_queue;
TRUNCATE TABLE notification;

-- Selling
TRUNCATE TABLE selling_sales_order;
TRUNCATE TABLE selling_quotation;
TRUNCATE TABLE selling_delivery_note;
TRUNCATE TABLE selling_invoice;

SET FOREIGN_KEY_CHECKS = 1;
