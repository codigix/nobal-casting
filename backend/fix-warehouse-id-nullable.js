import mysql from 'mysql2/promise'

async function fixWarehouseId() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  try {
    console.log('Making warehouse_id nullable...\n')
    
    await connection.query(
      'ALTER TABLE stock_movements MODIFY COLUMN warehouse_id INT NULL'
    )
    
    console.log('✅ Made warehouse_id nullable')
    
    const [rows] = await connection.query('DESCRIBE stock_movements')
    const warehouseRow = rows.find(r => r.Field === 'warehouse_id')
    console.log('\nUpdated column:', warehouseRow)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await connection.end()
  }
}

fixWarehouseId()
