import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306
})

async function makePoNoNullable() {
  let connection
  try {
    console.log('Connecting to database...')
    connection = await db.getConnection()
    console.log('✓ Database connection successful\n')

    console.log('Making po_no column nullable in grn_requests table...')
    try {
      await connection.query(`
        ALTER TABLE grn_requests 
        MODIFY COLUMN po_no VARCHAR(100)
      `)
      console.log('✓ po_no column is now nullable')
    } catch (error) {
      console.error('Error modifying po_no column:', error.message)
      throw error
    }

    console.log('\n✓ Migration completed successfully!')
    connection.release()
  } catch (error) {
    console.error('\n✗ Error:', error.message)
    if (connection) connection.release()
    process.exit(1)
  } finally {
    await db.end()
  }
}

makePoNoNullable()
