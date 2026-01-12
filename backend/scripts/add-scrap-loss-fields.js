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
    
    console.log('🔄 Starting scrap loss fields migration...\n')

    console.log('📝 Adding input_quantity to bom_scrap table...')
    try {
      await connection.query(
        `ALTER TABLE bom_scrap ADD COLUMN input_quantity DECIMAL(18,6)`
      )
      console.log('✅ Added input_quantity to bom_scrap table\n')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  input_quantity already exists in bom_scrap table\n')
      } else {
        throw err
      }
    }

    console.log('📝 Adding loss_percentage to bom_scrap table...')
    try {
      await connection.query(
        `ALTER TABLE bom_scrap ADD COLUMN loss_percentage DECIMAL(5,2)`
      )
      console.log('✅ Added loss_percentage to bom_scrap table\n')
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  loss_percentage already exists in bom_scrap table\n')
      } else {
        throw err
      }
    }

    console.log('✨ Migration completed successfully!')
    console.log('\n📊 Summary:')
    console.log('  ✓ bom_scrap.input_quantity - DECIMAL(18,6)')
    console.log('  ✓ bom_scrap.loss_percentage - DECIMAL(5,2)')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
    await pool.end()
  }
}

runMigration()
