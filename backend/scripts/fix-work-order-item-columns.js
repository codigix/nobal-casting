import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3307')
}

async function runMigration() {
  let connection
  try {
    connection = await mysql.createConnection(config)
    console.log('Connected to database')

    // Check columns in work_order_item
    const [columns] = await connection.execute('DESCRIBE work_order_item')
    const colNames = columns.map(c => c.Field)

    if (!colNames.includes('allocated_qty')) {
      await connection.query('ALTER TABLE work_order_item ADD COLUMN allocated_qty DECIMAL(18,6) DEFAULT 0 AFTER required_qty')
      console.log('✓ Added allocated_qty to work_order_item')
    } else {
      console.log('- allocated_qty already exists')
    }

    if (!colNames.includes('issued_qty')) {
      await connection.query('ALTER TABLE work_order_item ADD COLUMN issued_qty DECIMAL(18,6) DEFAULT 0 AFTER allocated_qty')
      console.log('✓ Added issued_qty to work_order_item')
      
      // Sync from transferred_qty
      await connection.query('UPDATE work_order_item SET issued_qty = transferred_qty WHERE transferred_qty > 0')
      console.log('✓ Synced issued_qty from transferred_qty')
    } else {
      console.log('- issued_qty already exists')
    }

    if (!colNames.includes('scrap_qty')) {
      await connection.query('ALTER TABLE work_order_item ADD COLUMN scrap_qty DECIMAL(18,6) DEFAULT 0 AFTER returned_qty')
      console.log('✓ Added scrap_qty to work_order_item')
    } else {
      console.log('- scrap_qty already exists')
    }

    if (!colNames.includes('operation')) {
      await connection.query('ALTER TABLE work_order_item ADD COLUMN operation VARCHAR(100) AFTER scrap_qty')
      console.log('✓ Added operation to work_order_item')
    } else {
      console.log('- operation already exists')
    }

    // Check columns in work_order_operation
    const [opColumns] = await connection.execute('DESCRIBE work_order_operation')
    const opColNames = opColumns.map(c => c.Field)

    const missingOpCols = [
      { name: 'hourly_rate', type: 'DECIMAL(10,2) DEFAULT 0', after: 'time' },
      { name: 'operation_type', type: 'VARCHAR(50) DEFAULT "IN_HOUSE"', after: 'hourly_rate' },
      { name: 'execution_mode', type: 'VARCHAR(50) DEFAULT "IN_HOUSE"', after: 'operation_type' },
      { name: 'vendor_id', type: 'INT', after: 'execution_mode' },
      { name: 'vendor_rate_per_unit', type: 'DECIMAL(18,6) DEFAULT 0', after: 'vendor_id' },
      { name: 'operating_cost', type: 'DECIMAL(18,6) DEFAULT 0', after: 'vendor_rate_per_unit' }
    ]

    for (const col of missingOpCols) {
      if (!opColNames.includes(col.name)) {
        await connection.query(`ALTER TABLE work_order_operation ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`)
        console.log(`✓ Added ${col.name} to work_order_operation`)
      } else {
        console.log(`- ${col.name} already exists in work_order_operation`)
      }
    }

    console.log('✓ Migration completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) await connection.end()
  }
}

runMigration()
