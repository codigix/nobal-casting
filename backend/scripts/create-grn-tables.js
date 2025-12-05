import { createPool } from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '../.env') })

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
})

async function createTables() {
  let connection
  try {
    console.log('Connecting to database...')
    connection = await db.getConnection()
    console.log('✓ Database connection successful')

    console.log('\n--- Creating GRN Request Tables ---\n')

    const tables = [
      {
        name: 'grn_requests',
        sql: `CREATE TABLE IF NOT EXISTS grn_requests (
          id INT AUTO_INCREMENT PRIMARY KEY,
          grn_no VARCHAR(100) UNIQUE NOT NULL,
          po_no VARCHAR(100) NOT NULL,
          supplier_id VARCHAR(100),
          supplier_name VARCHAR(255),
          receipt_date DATETIME,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status ENUM('pending', 'inspecting', 'approved', 'rejected', 'sent_back') DEFAULT 'pending',
          assigned_to INT,
          approval_date DATETIME,
          approved_by INT,
          rejection_date DATETIME,
          rejection_reason TEXT,
          total_items INT DEFAULT 0,
          total_accepted INT DEFAULT 0,
          total_rejected INT DEFAULT 0,
          notes TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id),
          FOREIGN KEY (assigned_to) REFERENCES users(id),
          FOREIGN KEY (approved_by) REFERENCES users(id),
          INDEX idx_grn_no (grn_no),
          INDEX idx_po_no (po_no),
          INDEX idx_status (status),
          INDEX idx_created_by (created_by),
          INDEX idx_assigned_to (assigned_to),
          INDEX idx_created_at (created_at)
        )`
      },
      {
        name: 'grn_request_items',
        sql: `CREATE TABLE IF NOT EXISTS grn_request_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          grn_request_id INT NOT NULL,
          item_code VARCHAR(100),
          item_name VARCHAR(255),
          po_qty DECIMAL(18,4),
          received_qty DECIMAL(18,4),
          accepted_qty DECIMAL(18,4) DEFAULT 0,
          rejected_qty DECIMAL(18,4) DEFAULT 0,
          batch_no VARCHAR(100),
          warehouse_name VARCHAR(255),
          item_status ENUM('pending', 'accepted', 'rejected', 'partially_accepted') DEFAULT 'pending',
          qc_checks JSON,
          notes TEXT,
          inspected_at DATETIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (grn_request_id) REFERENCES grn_requests(id) ON DELETE CASCADE,
          INDEX idx_grn_request_id (grn_request_id),
          INDEX idx_item_status (item_status),
          INDEX idx_item_code (item_code)
        )`
      },
      {
        name: 'grn_request_logs',
        sql: `CREATE TABLE IF NOT EXISTS grn_request_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          grn_request_id INT NOT NULL,
          action VARCHAR(100),
          status_from VARCHAR(50),
          status_to VARCHAR(50),
          reason TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (grn_request_id) REFERENCES grn_requests(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id),
          INDEX idx_grn_request_id (grn_request_id),
          INDEX idx_created_at (created_at)
        )`
      }
    ]

    for (const table of tables) {
      try {
        await connection.query(table.sql)
        console.log(`✓ ${table.name} created successfully`)
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`✓ ${table.name} already exists`)
        } else {
          console.error(`✗ Error creating ${table.name}:`, error.message)
        }
      }
    }

    console.log('\n--- Verification ---\n')
    const [tables_list] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [process.env.DB_NAME]
    )

    const grnTables = tables_list.filter(t => t.TABLE_NAME.includes('grn'))
    console.log(`Found ${grnTables.length} GRN tables:`)
    grnTables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`))

    console.log('\n✓ All GRN tables created successfully!')

    connection.release()
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message)
    if (connection) connection.release()
    process.exit(1)
  } finally {
    await db.end()
  }
}

createTables()
