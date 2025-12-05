import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp',
  port: process.env.DB_PORT || 3306
})

async function addSeriesNoColumn() {
  try {
    const connection = await pool.getConnection()

    console.log('Checking if series_no column exists...')
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'rfq' AND COLUMN_NAME = 'series_no'
    `)

    if (rows.length === 0) {
      console.log('Adding series_no column to rfq table...')
      await connection.execute(`
        ALTER TABLE rfq ADD COLUMN series_no VARCHAR(100) AFTER rfq_id
      `)
      console.log('✓ series_no column added successfully')
    } else {
      console.log('✓ series_no column already exists')
    }

    connection.release()
    pool.end()
    console.log('\n✓ Migration completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    pool.end()
    process.exit(1)
  }
}

addSeriesNoColumn()
