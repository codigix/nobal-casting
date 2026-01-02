import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting'
})

async function checkTables() {
  const conn = await pool.getConnection()
  try {
    const [tables] = await conn.execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    )
    
    const tableNames = tables.map(t => t.TABLE_NAME)
    console.log('Existing tables:', tableNames)
    
    const requiredTables = ['contact', 'material_request', 'material_request_item']
    const missing = requiredTables.filter(t => !tableNames.includes(t))
    
    if (missing.length > 0) {
      console.log('\nMissing tables:', missing)
    } else {
      console.log('\n✓ All required tables exist')
    }
  } finally {
    conn.release()
    await pool.end()
  }
}

checkTables().catch(e => console.error(e.message))
