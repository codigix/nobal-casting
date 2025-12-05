import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

async function runMigration() {
  let connection
  try {
    connection = await mysql.createConnection(config)
    console.log('Connected to database')

    const queries = [
      // Extend BOM table with additional columns
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS product_name VARCHAR(255)`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS allow_alternative_item BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS auto_sub_assembly_rate BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS project VARCHAR(100)`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS cost_rate_based_on VARCHAR(50) DEFAULT 'Valuation Rate'`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR'`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS with_operations BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE bom ADD COLUMN IF NOT EXISTS process_loss_percentage DECIMAL(5,2) DEFAULT 0`,

      // Create BOM table if not exists
      `CREATE TABLE IF NOT EXISTS bom (
        bom_id VARCHAR(50) PRIMARY KEY,
        item_code VARCHAR(100) NOT NULL,
        description TEXT,
        quantity DECIMAL(18,6) DEFAULT 1,
        uom VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Draft',
        revision INT DEFAULT 1,
        effective_date DATE,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_item_code (item_code),
        INDEX idx_created_at (created_at)
      )`,

      // Create BOM Line Items table
      `CREATE TABLE IF NOT EXISTS bom_line (
        line_id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id VARCHAR(50) NOT NULL,
        component_code VARCHAR(100) NOT NULL,
        quantity DECIMAL(18,6) NOT NULL,
        uom VARCHAR(50),
        component_description TEXT,
        component_type VARCHAR(50),
        sequence INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
        INDEX idx_bom_id (bom_id),
        INDEX idx_sequence (sequence),
        INDEX idx_component_code (component_code)
      )`,

      // Create Job Card table
      `CREATE TABLE IF NOT EXISTS job_card (
        job_card_id VARCHAR(50) PRIMARY KEY,
        work_order_id VARCHAR(50),
        machine_id VARCHAR(100),
        operator_id VARCHAR(100),
        planned_quantity DECIMAL(18,6),
        produced_quantity DECIMAL(18,6) DEFAULT 0,
        rejected_quantity DECIMAL(18,6) DEFAULT 0,
        scheduled_start_date DATETIME,
        scheduled_end_date DATETIME,
        actual_start_date DATETIME,
        actual_end_date DATETIME,
        status VARCHAR(50) DEFAULT 'Open',
        notes TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_work_order_id (work_order_id),
        INDEX idx_machine_id (machine_id),
        INDEX idx_operator_id (operator_id),
        INDEX idx_created_at (created_at)
      )`,

      // Create BOM Operations table
      `CREATE TABLE IF NOT EXISTS bom_operation (
        operation_id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id VARCHAR(50) NOT NULL,
        operation_name VARCHAR(100),
        workstation_type VARCHAR(100),
        operation_time DECIMAL(10,2),
        fixed_time DECIMAL(10,2) DEFAULT 0,
        operating_cost DECIMAL(18,2) DEFAULT 0,
        sequence INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
        INDEX idx_bom_id (bom_id),
        INDEX idx_sequence (sequence)
      )`,

      // Create BOM Scrap table
      `CREATE TABLE IF NOT EXISTS bom_scrap (
        scrap_id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        quantity DECIMAL(18,6),
        rate DECIMAL(18,2),
        sequence INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
        FOREIGN KEY (item_code) REFERENCES item(item_code),
        INDEX idx_bom_id (bom_id),
        INDEX idx_sequence (sequence)
      )`
    ]

    for (const query of queries) {
      try {
        await connection.execute(query)
        console.log('✓ Executed query successfully')
      } catch (error) {
        console.log('✗ Query error:', error.message)
      }
    }

    console.log('Migration completed!')
  } catch (error) {
    console.error('Migration failed:', error.message)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigration()
