import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'aluminium_erp',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function addDepartmentColumn() {
  let connection
  try {
    connection = await pool.getConnection()

    console.log('🔄 Checking if department column exists...')

    // Check if department column already exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'department'`
    )

    if (columns.length > 0) {
      console.log('✅ Department column already exists!')
      return
    }

    console.log('📝 Adding department column to users table...')

    // Add department column with default value 'buying'
    await connection.query(
      `ALTER TABLE users 
       ADD COLUMN department VARCHAR(50) DEFAULT 'buying' AFTER email`
    )

    console.log('✅ Department column added successfully!')

    // Update existing users to have a department (optional)
    console.log('🔄 Updating existing users...')
    await connection.query(
      `UPDATE users SET department = 'buying' WHERE department IS NULL`
    )

    console.log('✅ All existing users updated!')
    console.log('✨ Migration completed successfully!')

  } catch (error) {
    console.error('❌ Error during migration:', error.message)
    process.exit(1)
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

addDepartmentColumn()