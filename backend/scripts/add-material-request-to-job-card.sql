-- Migration: Link Material Request to Job Cards
-- Purpose: Add mr_id column to job_card table to track material request status before starting
-- Run with: node scripts/migrate-material-request-job-card.js

ALTER TABLE job_card ADD COLUMN mr_id VARCHAR(50) NULL;
ALTER TABLE job_card ADD COLUMN material_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE job_card ADD COLUMN material_received_date DATETIME NULL;

-- Add indexes for better query performance
ALTER TABLE job_card ADD INDEX idx_mr_id (mr_id);
ALTER TABLE job_card ADD INDEX idx_material_status (material_status);
