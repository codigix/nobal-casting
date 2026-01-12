import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function runMigration() {
  let connection
  try {
    connection = await pool.getConnection()
    
    console.log('🔄 Starting scrap calculation fields migration...\n')

    console.log('📝 Adding loss_percentage to item table...')
    try {
      await connection.query(
        `ALTER TABLE item ADD COLUMN loss_percentage DECIMAL(5,2) DEFAULT 0`
      )
      console.log('✅ Added loss_percentage to item table\n')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  loss_percentage already exists in item table\n')
      } else {
        throw err
      }
    }

    console.log('📝 Adding loss_percentage to bom_line table...')
    try {
      await connection.query(
        `ALTER TABLE bom_line ADD COLUMN loss_percentage DECIMAL(5,2)`
      )
      console.log('✅ Added loss_percentage to bom_line table\n')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  loss_percentage already exists in bom_line table\n')
      } else {
        throw err
      }
    }

    console.log('📝 Adding scrap_qty to bom_line table...')
    try {
      await connection.query(
        `ALTER TABLE bom_line ADD COLUMN scrap_qty DECIMAL(18,6) DEFAULT 0`
      )
      console.log('✅ Added scrap_qty to bom_line table\n')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  scrap_qty already exists in bom_line table\n')
      } else {
        throw err
      }
    }

    console.log('📝 Adding index on loss_percentage...')
    try {
      await connection.query(
        `ALTER TABLE bom_line ADD INDEX idx_loss_percentage (loss_percentage)`
      )
      console.log('✅ Added index on loss_percentage\n')
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index already exists on bom_line.loss_percentage\n')
      } else {
        throw err
      }
    }

    console.log('✨ Migration completed successfully!')
    console.log('\n📊 Summary:')
    console.log('  ✓ item.loss_percentage - DECIMAL(5,2) DEFAULT 0')
    console.log('  ✓ bom_line.loss_percentage - DECIMAL(5,2)')
    console.log('  ✓ bom_line.scrap_qty - DECIMAL(18,6) DEFAULT 0')
    console.log('  ✓ Index on bom_line.loss_percentage\n')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) connection.release()
    await pool.end()
  }
}

runMigration()
