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
      // Create Work Order Item table
      `CREATE TABLE IF NOT EXISTS work_order_item (
        item_id INT AUTO_INCREMENT PRIMARY KEY,
        wo_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        source_warehouse VARCHAR(100),
        required_qty DECIMAL(18,6) NOT NULL,
        transferred_qty DECIMAL(18,6) DEFAULT 0,
        consumed_qty DECIMAL(18,6) DEFAULT 0,
        returned_qty DECIMAL(18,6) DEFAULT 0,
        sequence INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wo_id) REFERENCES work_order(wo_id) ON DELETE CASCADE,
        FOREIGN KEY (item_code) REFERENCES item(item_code),
        INDEX idx_wo_id (wo_id),
        INDEX idx_sequence (sequence),
        INDEX idx_item_code (item_code)
      )`,

      // Create Work Order Operation table
      `CREATE TABLE IF NOT EXISTS work_order_operation (
        operation_id INT AUTO_INCREMENT PRIMARY KEY,
        wo_id VARCHAR(50) NOT NULL,
        operation VARCHAR(100),
        workstation VARCHAR(100),
        time DECIMAL(10,2),
        completed_qty DECIMAL(18,6) DEFAULT 0,
        process_loss_qty DECIMAL(18,6) DEFAULT 0,
        sequence INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wo_id) REFERENCES work_order(wo_id) ON DELETE CASCADE,
        INDEX idx_wo_id (wo_id),
        INDEX idx_sequence (sequence)
      )`,

      // Add missing columns to work_order table
      `ALTER TABLE work_order ADD COLUMN IF NOT EXISTS bom_no VARCHAR(50)`,
      `ALTER TABLE work_order ADD COLUMN IF NOT EXISTS planned_start_date DATETIME`,
      `ALTER TABLE work_order ADD COLUMN IF NOT EXISTS planned_end_date DATETIME`,
      `ALTER TABLE work_order ADD COLUMN IF NOT EXISTS actual_start_date DATETIME`,
      `ALTER TABLE work_order ADD COLUMN IF NOT EXISTS actual_end_date DATETIME`,
      `ALTER TABLE work_order ADD COLUMN IF NOT EXISTS expected_delivery_date DATE`
    ]

    for (const query of queries) {
      try {
        await connection.execute(query)
        console.log('✓ Executed query successfully')
      } catch (error) {
        console.log('⚠️  Query error:', error.message)
      }
    }

    console.log('✓ Migration completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigration()
