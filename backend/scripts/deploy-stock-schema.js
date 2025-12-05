import { createPool } from 'mysql2/promise'

async function deploySchema() {
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
      name: 'stock_balance',
      sql: `CREATE TABLE IF NOT EXISTS stock_balance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        current_qty DECIMAL(12, 2) DEFAULT 0,
        reserved_qty DECIMAL(12, 2) DEFAULT 0,
        available_qty DECIMAL(12, 2) DEFAULT 0,
        valuation_rate DECIMAL(12, 4) DEFAULT 0,
        total_value DECIMAL(16, 2) DEFAULT 0,
        last_receipt_date DATETIME,
        last_issue_date DATETIME,
        is_locked BOOLEAN DEFAULT FALSE,
        locked_reason VARCHAR(255),
        locked_by INT,
        locked_at DATETIME,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_item_warehouse (item_id, warehouse_id),
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (locked_by) REFERENCES users(id),
        INDEX idx_available_qty (available_qty),
        INDEX idx_item_id (item_id),
        INDEX idx_warehouse_id (warehouse_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'stock_ledger',
      sql: `CREATE TABLE IF NOT EXISTS stock_ledger (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        transaction_date DATETIME NOT NULL,
        transaction_type ENUM('Purchase Receipt', 'Issue', 'Transfer', 'Manufacturing Return', 'Repack', 'Scrap Entry', 'Reconciliation', 'Adjustment') NOT NULL,
        qty_in DECIMAL(12, 2) DEFAULT 0,
        qty_out DECIMAL(12, 2) DEFAULT 0,
        balance_qty DECIMAL(12, 2) DEFAULT 0,
        valuation_rate DECIMAL(12, 4) DEFAULT 0,
        transaction_value DECIMAL(16, 2) DEFAULT 0,
        reference_doctype VARCHAR(100),
        reference_name VARCHAR(100),
        remarks TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_item_warehouse_date (item_id, warehouse_id, transaction_date),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_reference (reference_doctype, reference_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'stock_entries',
      sql: `CREATE TABLE IF NOT EXISTS stock_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        entry_no VARCHAR(50) UNIQUE NOT NULL,
        entry_date DATETIME NOT NULL,
        entry_type ENUM('Material Receipt', 'Material Issue', 'Material Transfer', 'Manufacturing Return', 'Repack', 'Scrap Entry') NOT NULL,
        from_warehouse_id INT,
        to_warehouse_id INT,
        purpose VARCHAR(255),
        reference_doctype VARCHAR(100),
        reference_name VARCHAR(100),
        status ENUM('Draft', 'Submitted', 'Cancelled') DEFAULT 'Draft',
        total_qty DECIMAL(12, 2) DEFAULT 0,
        total_value DECIMAL(16, 2) DEFAULT 0,
        remarks TEXT,
        created_by INT NOT NULL,
        updated_by INT,
        approved_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        submitted_at DATETIME,
        FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id),
        INDEX idx_entry_no (entry_no),
        INDEX idx_entry_date (entry_date),
        INDEX idx_status (status),
        INDEX idx_entry_type (entry_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'stock_entry_items',
      sql: `CREATE TABLE IF NOT EXISTS stock_entry_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        stock_entry_id INT NOT NULL,
        item_id INT NOT NULL,
        qty DECIMAL(12, 2) NOT NULL,
        uom VARCHAR(20) DEFAULT 'Kg',
        valuation_rate DECIMAL(12, 4) DEFAULT 0,
        transaction_value DECIMAL(16, 2) DEFAULT 0,
        batch_no VARCHAR(100),
        serial_no VARCHAR(100),
        remarks TEXT,
        FOREIGN KEY (stock_entry_id) REFERENCES stock_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE RESTRICT,
        INDEX idx_stock_entry_id (stock_entry_id),
        INDEX idx_item_id (item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'material_transfers',
      sql: `CREATE TABLE IF NOT EXISTS material_transfers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        transfer_no VARCHAR(50) UNIQUE NOT NULL,
        transfer_date DATETIME NOT NULL,
        from_warehouse_id INT NOT NULL,
        to_warehouse_id INT NOT NULL,
        status ENUM('Draft', 'In Transit', 'Received', 'Cancelled') DEFAULT 'Draft',
        reference_doctype VARCHAR(100),
        reference_name VARCHAR(100),
        remarks TEXT,
        created_by INT NOT NULL,
        updated_by INT,
        received_by INT,
        received_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id),
        FOREIGN KEY (received_by) REFERENCES users(id),
        INDEX idx_transfer_no (transfer_no),
        INDEX idx_transfer_date (transfer_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'material_transfer_items',
      sql: `CREATE TABLE IF NOT EXISTS material_transfer_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        material_transfer_id INT NOT NULL,
        item_id INT NOT NULL,
        qty DECIMAL(12, 2) NOT NULL,
        uom VARCHAR(20) DEFAULT 'Kg',
        batch_no VARCHAR(100),
        serial_no VARCHAR(100),
        received_qty DECIMAL(12, 2) DEFAULT 0,
        remarks TEXT,
        FOREIGN KEY (material_transfer_id) REFERENCES material_transfers(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE RESTRICT,
        INDEX idx_material_transfer_id (material_transfer_id),
        INDEX idx_item_id (item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'batch_tracking',
      sql: `CREATE TABLE IF NOT EXISTS batch_tracking (
        id INT PRIMARY KEY AUTO_INCREMENT,
        batch_no VARCHAR(100) UNIQUE NOT NULL,
        item_id INT NOT NULL,
        manufacturing_date DATE,
        expiry_date DATE,
        warehouse_id INT,
        current_qty DECIMAL(12, 2) DEFAULT 0,
        status ENUM('Active', 'Expired', 'Consumed') DEFAULT 'Active',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_batch_no (batch_no),
        INDEX idx_item_id (item_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'stock_reconciliation',
      sql: `CREATE TABLE IF NOT EXISTS stock_reconciliation (
        id INT PRIMARY KEY AUTO_INCREMENT,
        reconciliation_no VARCHAR(50) UNIQUE NOT NULL,
        reconciliation_date DATETIME NOT NULL,
        warehouse_id INT NOT NULL,
        purpose VARCHAR(255),
        status ENUM('Draft', 'Submitted', 'Completed') DEFAULT 'Draft',
        total_items INT DEFAULT 0,
        remarks TEXT,
        created_by INT NOT NULL,
        submitted_by INT,
        submitted_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (submitted_by) REFERENCES users(id),
        INDEX idx_reconciliation_no (reconciliation_no),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'stock_reconciliation_items',
      sql: `CREATE TABLE IF NOT EXISTS stock_reconciliation_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        stock_reconciliation_id INT NOT NULL,
        item_id INT NOT NULL,
        system_qty DECIMAL(12, 2) DEFAULT 0,
        physical_qty DECIMAL(12, 2) DEFAULT 0,
        difference DECIMAL(12, 2) DEFAULT 0,
        variance_percentage DECIMAL(5, 2) DEFAULT 0,
        remarks TEXT,
        FOREIGN KEY (stock_reconciliation_id) REFERENCES stock_reconciliation(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE RESTRICT,
        INDEX idx_stock_reconciliation_id (stock_reconciliation_id),
        INDEX idx_item_id (item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'reorder_management',
      sql: `CREATE TABLE IF NOT EXISTS reorder_management (
        id INT PRIMARY KEY AUTO_INCREMENT,
        item_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        reorder_level DECIMAL(12, 2) DEFAULT 0,
        reorder_quantity DECIMAL(12, 2) DEFAULT 0,
        lead_time_days INT DEFAULT 0,
        supplier_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_item_warehouse_reorder (item_id, warehouse_id),
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        INDEX idx_item_id (item_id),
        INDEX idx_warehouse_id (warehouse_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    },
    {
      name: 'reorder_items',
      sql: `CREATE TABLE IF NOT EXISTS reorder_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        reorder_management_id INT NOT NULL,
        item_id INT NOT NULL,
        reorder_date DATE,
        reorder_qty DECIMAL(12, 2),
        received_qty DECIMAL(12, 2) DEFAULT 0,
        status ENUM('Pending', 'Ordered', 'Received', 'Cancelled') DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reorder_management_id) REFERENCES reorder_management(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE RESTRICT,
        INDEX idx_reorder_management_id (reorder_management_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    }
  ]

  try {
    console.log('📋 Starting stock module schema deployment...\n')
    
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

    console.log('\n✅ Stock schema deployment completed!')

    // Verify tables
    console.log('\n📊 Verifying tables...')
    const conn = await pool.getConnection()
    const [result] = await conn.query('SHOW TABLES')
    conn.release()
    
    if (result && result.length > 0) {
      console.log(`\nTotal tables in database: ${result.length}`)
      result.forEach(r => console.log(`  ✓ ${Object.values(r)[0]}`))
    }

    pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Fatal Error:', error.message)
    pool.end()
    process.exit(1)
  }
}

deploySchema()