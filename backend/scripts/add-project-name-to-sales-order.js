import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function runMigration() {
  let connection
  try {
    connection = await pool.getConnection()
    
    console.log('🔄 Starting project name migration for sales orders...\n')

    console.log('📝 Adding project_name to selling_sales_order table...')
    try {
      await connection.query(
        `ALTER TABLE selling_sales_order ADD COLUMN project_name VARCHAR(255) AFTER quotation_id`
      )
      console.log('✅ Added project_name to selling_sales_order table\n')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  project_name already exists in selling_sales_order table\n')
      } else {
        throw err
      }
    }

    console.log('✨ Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

runMigration()
