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
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  try {
    console.log('📂 Reading stock schema file...')
    const schemaPath = path.join(__dirname, 'stock_schema_fixed.sql')
    const sql = fs.readFileSync(schemaPath, 'utf-8')

    // Split by GO or semicolon for multiple statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`)

    for (let i = 0; i < statements.length; i++) {
      try {
        const conn = await pool.getConnection()
        await conn.query(statements[i])
        conn.release()
        
        // Extract table name from statement
        const tableMatch = statements[i].match(/CREATE TABLE[^(]*(\w+)/i)
        const tableName = tableMatch ? tableMatch[1] : `Statement ${i + 1}`
        
        console.log(`✓ ${tableName}`)
      } catch (error) {
        const tableMatch = statements[i].match(/CREATE TABLE[^(]*(\w+)/i)
        const tableName = tableMatch ? tableMatch[1] : `Statement ${i + 1}`
        console.log(`⚠ ${tableName}: ${error.message.substring(0, 80)}`)
      }
    }

    console.log('\n✅ Stock schema creation completed!')

    // Verify tables
    console.log('\n📊 Verifying tables...')
    const conn = await pool.getConnection()
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = 'aluminium_erp' 
       AND (TABLE_NAME LIKE '%warehouse%' OR TABLE_NAME LIKE '%stock%' OR TABLE_NAME LIKE '%batch%' OR TABLE_NAME LIKE '%material%' OR TABLE_NAME LIKE '%reorder%')
       ORDER BY TABLE_NAME`
    )
    conn.release()
    
    if (tables.length > 0) {
      console.log(`Found ${tables.length} tables:`)
      tables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`))
    }

    pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    pool.end()
    process.exit(1)
  }
}

runSchema()