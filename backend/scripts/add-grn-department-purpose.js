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

async function addGRNDepartmentPurpose() {
  let connection
  try {
    console.log('Connecting to database...')
    connection = await db.getConnection()
    console.log('✓ Database connection successful\n')

    console.log('Adding department column to grn_requests table...')
    try {
      await connection.query(`
        ALTER TABLE grn_requests 
        ADD COLUMN department VARCHAR(100)
      `)
      console.log('✓ department column added successfully')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ department column already exists')
      } else {
        throw error
      }
    }

    console.log('Adding purpose column to grn_requests table...')
    try {
      await connection.query(`
        ALTER TABLE grn_requests 
        ADD COLUMN purpose VARCHAR(100)
      `)
      console.log('✓ purpose column added successfully')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ purpose column already exists')
      } else {
        throw error
      }
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

addGRNDepartmentPurpose()
