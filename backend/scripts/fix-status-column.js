import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function fixStatusColumn() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'aluminium_erp',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔧 Adding status column to supplier_quotation...')
    
    // Check if column exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'supplier_quotation' AND COLUMN_NAME = 'status'`
    )
    
    if (columns.length > 0) {
      console.log('✓ Status column already exists')
      return
    }
    
    // Add the column
    await connection.execute(
      `ALTER TABLE supplier_quotation 
       ADD COLUMN status ENUM('draft', 'received', 'evaluated', 'accepted', 'rejected') 
       DEFAULT 'draft' AFTER quote_date`
    )
    
    console.log('✓ Status column added successfully!')
    
    // Verify
    const [result] = await connection.query('DESCRIBE supplier_quotation')
    console.log('✓ Table structure:', result.map(r => r.Field))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

fixStatusColumn()