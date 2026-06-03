-- =====================================================
-- SELLING MODULE UPGRADE: LEADS & RFQS
-- =====================================================

-- Lead Table
CREATE TABLE IF NOT EXISTS selling_lead (
  lead_id VARCHAR(50) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  company_name VARCHAR(255),
  source VARCHAR(100), -- 'Website', 'Referral', 'Exhibition', etc.
  status ENUM('new', 'contacted', 'qualified', 'converted', 'lost') DEFAULT 'new',
  lead_score DECIMAL(5, 2) DEFAULT 0, -- AI Lead Score (0-100)
  score_reasoning TEXT, -- Why AI gave this score
  assigned_to VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_email (email),
  INDEX idx_lead_score (lead_score)
);

-- RFQ Table (Inquiry)
CREATE TABLE IF NOT EXISTS selling_rfq (
  rfq_id VARCHAR(50) PRIMARY KEY,
  lead_id VARCHAR(50),
  customer_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  received_date DATE,
  due_date DATE,
  estimated_value DECIMAL(15, 2),
  document_url TEXT, -- Path to uploaded RFQ PDF/Doc
  analysis_results JSONB, -- AI Analysis Results (Materials, Quantities, Specs)
  status ENUM('pending', 'analyzed', 'quoted', 'closed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  FOREIGN KEY (lead_id) REFERENCES selling_lead(lead_id),
  FOREIGN KEY (customer_id) REFERENCES selling_customer(customer_id),
  INDEX idx_status (status),
  INDEX idx_customer (customer_id)
);

-- RFQ Items (Detailed requirements)
CREATE TABLE IF NOT EXISTS selling_rfq_item (
  id SERIAL PRIMARY KEY,
  rfq_id VARCHAR(50) NOT NULL,
  item_description TEXT,
  material_grade VARCHAR(100),
  quantity DECIMAL(15, 2),
  uom VARCHAR(20),
  target_price DECIMAL(15, 2),
  FOREIGN KEY (rfq_id) REFERENCES selling_rfq(rfq_id),
  INDEX idx_rfq (rfq_id)
);
