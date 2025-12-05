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
  database: process.env.DB_NAME || 'erpdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function addConfirmedAtColumn() {
  const connection = await pool.getConnection()
  
  try {
    // Check if column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'selling_sales_order' AND COLUMN_NAME = 'confirmed_at'`
    )

    if (columns.length > 0) {
      console.log('✓ Column "confirmed_at" already exists in selling_sales_order table')
      return
    }

    // Add the column
    await connection.execute(
      `ALTER TABLE selling_sales_order 
       ADD COLUMN confirmed_at TIMESTAMP NULL 
       AFTER updated_at`
    )

    console.log('✓ Successfully added "confirmed_at" column to selling_sales_order table')
  } catch (error) {
    console.error('✗ Error adding confirmed_at column:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

addConfirmedAtColumn()
  .then(() => {
    console.log('Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })