import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables from backend .env
dotenv.config({ path: path.join(__dirname, '../.env') })

async function addSalesOrderTable() {
  const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aluminium_erp',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  try {
    console.log('🔧 Adding sales_order table...')
    const conn = await pool.getConnection()

    // Create sales_order table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sales_order (
        sales_order_id VARCHAR(50) PRIMARY KEY,
        so_id VARCHAR(50) UNIQUE,
        customer_id VARCHAR(50),
        customer_name VARCHAR(255),
        quotation_id VARCHAR(50),
        order_date DATE,
        delivery_date DATE,
        total_value DECIMAL(15,2),
        tax_amount DECIMAL(15,2),
        grand_total DECIMAL(15,2),
        status ENUM('draft', 'confirmed', 'dispatched', 'invoiced', 'cancelled') DEFAULT 'draft',
        notes TEXT,
        created_by_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_so_id (so_id),
        INDEX idx_customer_id (customer_id),
        INDEX idx_order_date (order_date),
        INDEX idx_status (status)
      )
    `

    await conn.query(createTableSQL)
    console.log('✅ sales_order table created successfully!')

    // Verify the table exists
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = 'aluminium_erp' 
       AND TABLE_NAME = 'sales_order'`
    )

    if (tables.length > 0) {
      console.log('✅ Verification: sales_order table exists in database')
    } else {
      console.log('⚠️ Warning: sales_order table not found after creation')
    }

    conn.release()
    await pool.end()
    console.log('✅ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

addSalesOrderTable()