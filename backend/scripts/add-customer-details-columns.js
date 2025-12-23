import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '../.env') })

async function addCustomerDetailsColumns() {
  const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  try {
    console.log('🔧 Adding customer details columns to selling_sales_order table...')
    const conn = await pool.getConnection()

    const columnsToAdd = [
      { name: 'customer_name', definition: 'customer_name VARCHAR(255) DEFAULT NULL' },
      { name: 'customer_email', definition: 'customer_email VARCHAR(255) DEFAULT NULL' },
      { name: 'customer_phone', definition: 'customer_phone VARCHAR(20) DEFAULT NULL' }
    ]

    for (const column of columnsToAdd) {
      try {
        const [result] = await conn.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'selling_sales_order' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME || 'nobalcasting', column.name]
        )

        if (result.length === 0) {
          console.log(`  ➕ Adding column: ${column.name}...`)
          await conn.query(`ALTER TABLE selling_sales_order ADD COLUMN ${column.definition}`)
          console.log(`  ✅ Column '${column.name}' added successfully`)
        } else {
          console.log(`  ✓ Column '${column.name}' already exists`)
        }
      } catch (error) {
        console.error(`  ❌ Error adding column '${column.name}':`, error.message)
      }
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

addCustomerDetailsColumns()
