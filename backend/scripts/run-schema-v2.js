import fs from 'fs'
import { createPool } from 'mysql2/promise'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runSchema() {
  const pool = createPool({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'aluminium_erp',
    port: 3306,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  try {
    console.log('📂 Reading schema file...')
    const schemaPath = path.join(__dirname, 'stock_inventory_schema.sql')
    let sql = fs.readFileSync(schemaPath, 'utf-8')

    // Remove comments
    sql = sql.replace(/--.*$/gm, '')

    console.log('🔧 Executing schema...')
    const conn = await pool.getConnection()
    const result = await conn.query(sql)
    conn.release()

    console.log('✅ Schema creation completed!')
    
    // Check tables
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = 'aluminium_erp' 
       AND TABLE_NAME LIKE '%warehouse%' OR TABLE_NAME LIKE '%stock%'`
    )
    
    console.log('\n📊 Created tables:')
    tables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`))
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

runSchema()