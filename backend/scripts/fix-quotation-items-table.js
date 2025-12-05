import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function fixTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'aluminium_erp',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  })

  try {
    console.log('🔧 Fixing supplier_quotation_item table...')
    
    // Drop old table
    await connection.execute('DROP TABLE IF EXISTS supplier_quotation_item')
    console.log('✓ Old table dropped')
    
    // Recreate with correct schema
    await connection.execute(`
      CREATE TABLE supplier_quotation_item (
        sq_item_id VARCHAR(50) PRIMARY KEY,
        supplier_quotation_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(50) NOT NULL,
        rate DECIMAL(15,2),
        lead_time_days INT,
        min_qty DECIMAL(15,3),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_quotation_id) REFERENCES supplier_quotation(supplier_quotation_id),
        FOREIGN KEY (item_code) REFERENCES item(item_code),
        INDEX idx_sq (supplier_quotation_id)
      )
    `)
    
    console.log('✓ Table recreated successfully!')
    
    // Verify
    const [result] = await connection.query('DESCRIBE supplier_quotation_item')
    console.log('✓ New structure:')
    result.forEach(row => {
      console.log(`  - ${row.Field}: ${row.Type}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

fixTable()