-- QC Workflow Enhancement
-- Adds QC tracking fields and document sequences support for GRN workflow

USE nobalcasting;

-- Add qc_approved_by and qc_approved_at fields if they don't exist
ALTER TABLE grn_requests ADD COLUMN IF NOT EXISTS qc_approved_by INT;
ALTER TABLE grn_requests ADD COLUMN IF NOT EXISTS qc_approved_at DATETIME;
ALTER TABLE grn_requests ADD FOREIGN KEY IF NOT EXISTS fk_qc_approved_by (qc_approved_by) REFERENCES users(id);

-- Ensure grn_request_items has qc_status field for tracking QC results
ALTER TABLE grn_request_items ADD COLUMN IF NOT EXISTS qc_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE grn_request_items ADD COLUMN IF NOT EXISTS bin_rack VARCHAR(100);
ALTER TABLE grn_request_items ADD COLUMN IF NOT EXISTS valuation_rate DECIMAL(18,2) DEFAULT 0;

-- Create document sequences table for sequential numbering
CREATE TABLE IF NOT EXISTS document_sequences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_type VARCHAR(50) NOT NULL,
  sequence_date DATE NOT NULL,
  next_number INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doc_date (document_type, sequence_date),
  INDEX idx_document_type (document_type),
  INDEX idx_sequence_date (sequence_date)
);

-- Add QC log entry type support to grn_request_logs
-- (no schema change needed as action field is VARCHAR and can accept any value)

-- Verify qc_checks field exists in grn_request_items
-- It should already exist as JSON field, defined in grn_requests_schema.sql
