import mysql from 'mysql2/promise'

async function fixEnum() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  try {
    console.log('Updating movement_type ENUM to include TRANSFER...\n')
    
    await connection.query(
      "ALTER TABLE stock_movements MODIFY COLUMN movement_type ENUM('IN', 'OUT', 'TRANSFER') NOT NULL"
    )
    
    console.log('✅ Updated movement_type ENUM to include TRANSFER')
    
    const [rows] = await connection.query('DESCRIBE stock_movements')
    const movementTypeRow = rows.find(r => r.Field === 'movement_type')
    console.log('\nUpdated column:', movementTypeRow)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await connection.end()
  }
}

fixEnum()
