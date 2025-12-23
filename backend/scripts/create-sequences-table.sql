USE nobalcasting;

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
