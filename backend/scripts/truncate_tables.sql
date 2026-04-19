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
TRUNCATE TABLE workstation;
TRUNCATE TABLE machine_master;
TRUNCATE TABLE operations;
TRUNCATE TABLE bom;
TRUNCATE TABLE bom_line;
TRUNCATE TABLE bom_operation;

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
TRUNCATE TABLE warehouse;
TRUNCATE TABLE item;
TRUNCATE TABLE supplier;
TRUNCATE TABLE supplier_group;
TRUNCATE TABLE supplier_contact;
TRUNCATE TABLE supplier_address;
TRUNCATE TABLE supplier_scorecard;

-- Selling
TRUNCATE TABLE selling_sales_order;
TRUNCATE TABLE selling_quotation;
TRUNCATE TABLE selling_delivery_note;
TRUNCATE TABLE selling_invoice;
TRUNCATE TABLE selling_customer;

-- Finance & Accounts
TRUNCATE TABLE account;
TRUNCATE TABLE journal_entry;
TRUNCATE TABLE journal_entry_account;
TRUNCATE TABLE payment_entry;
TRUNCATE TABLE expense_claim;
TRUNCATE TABLE finance_ledger;

-- Core & System
TRUNCATE TABLE contact;
TRUNCATE TABLE address;
TRUNCATE TABLE company;
TRUNCATE TABLE manual_review_queue;
TRUNCATE TABLE notification;
TRUNCATE TABLE migration_audit_log;
TRUNCATE TABLE historical_metrics;

SET FOREIGN_KEY_CHECKS = 1;
