import { createPool } from 'mysql2/promise'

async function createGRNRequestsTables() {
  const pool = createPool({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'aluminium_erp',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  const tables = [
    {
      name: 'grn_requests',
      sql: `CREATE TABLE IF NOT EXISTS grn_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        grn_no VARCHAR(100) NOT NULL,
        po_no VARCHAR(100),
        supplier_id INT,
        supplier_name VARCHAR(255),
        receipt_date DATETIME,
        created_by INT,
        assigned_to INT,
        status ENUM('pending', 'inspecting', 'approved', 'rejected', 'sent_back') DEFAULT 'pending',
        approval_date DATETIME,
        approved_by INT,
        rejection_reason TEXT,
        rejection_date DATETIME,
        total_items INT DEFAULT 0,
        total_accepted INT DEFAULT 0,
        total_rejected INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_grn_no (grn_no),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by),
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_po_no (po_no),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (assigned_to) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'grn_request_items',
      sql: `CREATE TABLE IF NOT EXISTS grn_request_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        grn_request_id INT NOT NULL,
        item_code VARCHAR(100),
        item_name VARCHAR(255),
        po_qty DECIMAL(12, 2),
        received_qty DECIMAL(12, 2),
        accepted_qty DECIMAL(12, 2) DEFAULT 0,
        rejected_qty DECIMAL(12, 2) DEFAULT 0,
        batch_no VARCHAR(100),
        warehouse_name VARCHAR(255),
        item_status ENUM('pending', 'accepted', 'rejected', 'partially_accepted') DEFAULT 'pending',
        quality_issues TEXT,
        notes TEXT,
        FOREIGN KEY (grn_request_id) REFERENCES grn_requests(id) ON DELETE CASCADE,
        INDEX idx_grn_request_id (grn_request_id),
        INDEX idx_item_status (item_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'grn_request_logs',
      sql: `CREATE TABLE IF NOT EXISTS grn_request_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        grn_request_id INT NOT NULL,
        action VARCHAR(50),
        status_from VARCHAR(50),
        status_to VARCHAR(50),
        reason TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grn_request_id) REFERENCES grn_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_grn_request_id (grn_request_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    }
  ]

  try {
    console.log('📋 Starting GRN Requests schema deployment...\n')
    
    for (const table of tables) {
      try {
        const conn = await pool.getConnection()
        await conn.query(table.sql)
        conn.release()
        console.log(`✅ ${table.name}`)
      } catch (error) {
        console.log(`⚠️  ${table.name}: ${error.message.substring(0, 100)}`)
      }
    }

    console.log('\n✅ GRN Requests schema deployment completed!')
    pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Fatal Error:', error.message)
    pool.end()
    process.exit(1)
  }
}

createGRNRequestsTables()
