import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

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

async function addQuantityColumn() {
  const connection = await pool.getConnection()
  try {
    console.log('Adding quantity column to selling_sales_order table...')
    
    await connection.execute(`
      ALTER TABLE selling_sales_order 
      ADD COLUMN quantity DECIMAL(10, 2) DEFAULT 1
    `)
    
    console.log('✓ quantity column added successfully')
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✓ quantity column already exists')
    } else {
      console.error('Error adding quantity column:', error.message)
    }
  } finally {
    connection.release()
    process.exit(0)
  }
}

addQuantityColumn()
