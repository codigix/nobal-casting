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

async function addMaterialRequestIdColumn() {
  let connection
  try {
    console.log('Connecting to database...')
    connection = await db.getConnection()
    console.log('✓ Database connection successful\n')

    console.log('Adding material_request_id column to grn_requests table...')
    
    try {
      await connection.query(`
        ALTER TABLE grn_requests 
        ADD COLUMN material_request_id VARCHAR(50),
        ADD FOREIGN KEY (material_request_id) REFERENCES material_request(mr_id) ON DELETE SET NULL
      `)
      console.log('✓ material_request_id column added successfully')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('✓ material_request_id column already exists')
      } else if (error.code === 'ER_NO_REFERENCED_TABLE') {
        console.log('⚠ material_request table not found, adding column without foreign key constraint')
        await connection.query(`
          ALTER TABLE grn_requests 
          ADD COLUMN material_request_id VARCHAR(50)
        `)
        console.log('✓ material_request_id column added (without FK constraint)')
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

addMaterialRequestIdColumn()
