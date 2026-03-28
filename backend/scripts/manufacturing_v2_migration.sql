-- Manufacturing Execution Workflow Enhancement Migration
-- Focus: Work Orders, Job Cards, Production Entries, and Outsource operations

-- 1. Update BOM Operation to include setup and cycle time
ALTER TABLE bom_operation ADD setup_time DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bom_operation ADD cycle_time DECIMAL(10,2) DEFAULT 0;

-- 2. Update Work Order Operation to include setup and cycle time
ALTER TABLE work_order_operation ADD setup_time DECIMAL(10,2) DEFAULT 0;
ALTER TABLE work_order_operation ADD cycle_time DECIMAL(10,2) DEFAULT 0;

-- 3. Update Job Card to include core execution fields
ALTER TABLE job_card ADD setup_time DECIMAL(10,2) DEFAULT 0;
ALTER TABLE job_card ADD cycle_time DECIMAL(10,2) DEFAULT 0;
ALTER TABLE job_card ADD workstation_id VARCHAR(100); -- Ensure consistency with machine_id
ALTER TABLE job_card ADD operator_id VARCHAR(100); -- Ensure consistency with operator_name

-- 4. Update Time Log to match "Production Entry" requirements
ALTER TABLE time_log ADD downtime_minutes INT DEFAULT 0;
ALTER TABLE time_log ADD produced_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE time_log ADD start_time TIME; -- For explicit production entry tracking
ALTER TABLE time_log ADD end_time TIME;   -- For explicit production entry tracking

-- 5. Outsource Job Card enhancements (ensure these exist)
-- execution_mode might already be ENUM, so we use MODIFY
ALTER TABLE job_card MODIFY COLUMN execution_mode ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE';
ALTER TABLE job_card ADD vendor_id VARCHAR(50);
ALTER TABLE job_card ADD send_date DATE;
ALTER TABLE job_card ADD expected_return_date DATE;
ALTER TABLE job_card ADD vendor_rate_per_unit DECIMAL(18,2) DEFAULT 0;

-- 6. Standardize status for Job Card lifecycle
ALTER TABLE job_card MODIFY COLUMN status VARCHAR(50) DEFAULT 'DRAFT';

-- 7. Work Order Progress and Totals
ALTER TABLE work_order ADD total_produced_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE work_order ADD total_accepted_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE work_order ADD total_rejected_qty DECIMAL(18,6) DEFAULT 0;
ALTER TABLE work_order ADD progress DECIMAL(5,2) DEFAULT 0;
