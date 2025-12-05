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
    console.log('📂 Reading schema file...')
    const schemaPath = path.join(__dirname, 'stock_inventory_schema.sql')
    const sql = fs.readFileSync(schemaPath, 'utf-8')

    // Split by semicolon and filter empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📋 Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      try {
        const conn = await pool.getConnection()
        await conn.query(statements[i])
        conn.release()
        console.log(`✓ Statement ${i + 1}/${statements.length} executed`)
      } catch (error) {
        console.log(`⚠ Statement ${i + 1}/${statements.length}: ${error.message.substring(0, 100)}`)
      }
    }

    console.log('\n✅ Schema creation completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

runSchema()