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

async function addItemGroupColumn() {
  const connection = await pool.getConnection()
  
  try {
    console.log('Checking for item_group column in bom_raw_material table...')
    
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'bom_raw_material' AND COLUMN_NAME = 'item_group'`
    )

    if (columns.length > 0) {
      console.log('✓ item_group column already exists in bom_raw_material table')
      return
    }

    console.log('Adding item_group column to bom_raw_material table...')

    await connection.execute(
      `ALTER TABLE bom_raw_material ADD COLUMN item_group VARCHAR(100) AFTER item_name`
    )
    console.log('✓ Added item_group column to bom_raw_material table')
    console.log('✓ Migration completed successfully!')
  } catch (error) {
    console.error('✗ Error adding item_group column:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

addItemGroupColumn()
  .then(() => {
    console.log('All tasks completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
