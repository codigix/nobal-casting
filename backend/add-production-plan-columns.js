import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function addColumnsToProductionPlan() {
  const connection = await pool.getConnection()
  
  try {
    console.log('Adding missing columns to production_plan table...')
    
    // Check if sales_order_id column exists
    const [salesOrderIdCols] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'production_plan' AND COLUMN_NAME = 'sales_order_id'`
    )

    if (salesOrderIdCols.length === 0) {
      console.log('Adding sales_order_id column...')
      await connection.execute(`
        ALTER TABLE production_plan 
        ADD COLUMN sales_order_id VARCHAR(100),
        ADD INDEX idx_sales_order_id (sales_order_id)
      `)
      console.log('✓ sales_order_id column added')
    } else {
      console.log('✓ sales_order_id column already exists')
    }

    // Check if bom_id column exists
    const [bomIdCols] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'production_plan' AND COLUMN_NAME = 'bom_id'`
    )

    if (bomIdCols.length === 0) {
      console.log('Adding bom_id column...')
      await connection.execute(`
        ALTER TABLE production_plan 
        ADD COLUMN bom_id VARCHAR(100),
        ADD INDEX idx_bom_id (bom_id)
      `)
      console.log('✓ bom_id column added')
    } else {
      console.log('✓ bom_id column already exists')
    }

    console.log('✓ Migration completed successfully!')
  } catch (error) {
    console.error('✗ Error:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

addColumnsToProductionPlan()
  .then(() => {
    console.log('All tasks completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
