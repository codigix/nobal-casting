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

async function addBomDetailsColumns() {
  const connection = await pool.getConnection()
  
  try {
    console.log('Checking for existing BOM details columns...')
    
    // Check if columns already exist
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'selling_sales_order' AND COLUMN_NAME IN ('bom_finished_goods', 'bom_raw_materials', 'bom_operations')`
    )

    const existingColumns = columns.map(c => c.COLUMN_NAME)
    const missingColumns = []

    if (!existingColumns.includes('bom_finished_goods')) {
      missingColumns.push('bom_finished_goods')
    }
    if (!existingColumns.includes('bom_raw_materials')) {
      missingColumns.push('bom_raw_materials')
    }
    if (!existingColumns.includes('bom_operations')) {
      missingColumns.push('bom_operations')
    }

    if (missingColumns.length === 0) {
      console.log('✓ All BOM details columns already exist in selling_sales_order table')
      return
    }

    console.log(`Adding missing columns: ${missingColumns.join(', ')}`)

    // Add bom_finished_goods column
    if (missingColumns.includes('bom_finished_goods')) {
      await connection.execute(
        `ALTER TABLE selling_sales_order ADD COLUMN bom_finished_goods LONGTEXT AFTER order_type`
      )
      console.log('✓ Added bom_finished_goods column')
    }

    // Add bom_raw_materials column
    if (missingColumns.includes('bom_raw_materials')) {
      await connection.execute(
        `ALTER TABLE selling_sales_order ADD COLUMN bom_raw_materials LONGTEXT AFTER bom_finished_goods`
      )
      console.log('✓ Added bom_raw_materials column')
    }

    // Add bom_operations column
    if (missingColumns.includes('bom_operations')) {
      await connection.execute(
        `ALTER TABLE selling_sales_order ADD COLUMN bom_operations LONGTEXT AFTER bom_raw_materials`
      )
      console.log('✓ Added bom_operations column')
    }

    // Create index for faster lookups
    try {
      await connection.execute(
        `ALTER TABLE selling_sales_order ADD INDEX IF NOT EXISTS idx_bom_id (bom_id)`
      )
      console.log('✓ Added index on bom_id')
    } catch (e) {
      console.log('Index idx_bom_id may already exist')
    }

    try {
      await connection.execute(
        `ALTER TABLE selling_sales_order ADD INDEX IF NOT EXISTS idx_customer_id (customer_id)`
      )
      console.log('✓ Added index on customer_id')
    } catch (e) {
      console.log('Index idx_customer_id may already exist')
    }

    console.log('✓ Successfully added all BOM details columns to selling_sales_order table')
  } catch (error) {
    console.error('✗ Error adding BOM details columns:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

addBomDetailsColumns()
  .then(() => {
    console.log('Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
