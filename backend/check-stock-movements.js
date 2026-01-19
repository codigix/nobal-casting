import mysql from 'mysql2/promise'

async function checkTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  try {
    console.log('Checking stock_movements table structure...\n')
    const [rows] = await connection.query('DESCRIBE stock_movements')
    console.table(rows)

    console.log('\n\nAttempting to add missing columns...\n')
    
    // Check if columns exist and add if they don't
    const columns = rows.map(r => r.Field)
    
    if (!columns.includes('source_warehouse_id')) {
      await connection.query('ALTER TABLE stock_movements ADD COLUMN source_warehouse_id INT AFTER warehouse_id')
      console.log('✅ Added source_warehouse_id column')
    }
    
    if (!columns.includes('target_warehouse_id')) {
      await connection.query('ALTER TABLE stock_movements ADD COLUMN target_warehouse_id INT AFTER source_warehouse_id')
      console.log('✅ Added target_warehouse_id column')
    }

    console.log('\nUpdated table structure:')
    const [updatedRows] = await connection.query('DESCRIBE stock_movements')
    console.table(updatedRows)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await connection.end()
  }
}

checkTable()
