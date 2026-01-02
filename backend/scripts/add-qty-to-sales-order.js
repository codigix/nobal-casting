import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function addQtyToSalesOrder() {
  const connection = await pool.getConnection()
  
  try {
    console.log('Checking for qty column in selling_sales_order...')
    
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'selling_sales_order' AND COLUMN_NAME = 'qty'`
    )

    if (columns.length > 0) {
      console.log('✓ qty column already exists')
      return
    }

    console.log('Adding qty column to selling_sales_order...')
    await connection.execute(
      `ALTER TABLE selling_sales_order ADD COLUMN qty DECIMAL(15,3) DEFAULT 1 AFTER bom_name`
    )
    
    console.log('✓ Successfully added qty column to selling_sales_order')
  } catch (error) {
    console.error('✗ Error adding qty column:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

addQtyToSalesOrder()
  .then(() => {
    console.log('Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
