import fs from 'fs'
import { createPool } from 'mysql2/promise'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runProductionSchema() {
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
    console.log('📂 Reading production schema file...')
    const schemaPath = path.join(__dirname, 'add-departments-schema.sql')
    let sql = fs.readFileSync(schemaPath, 'utf-8')

    // Remove SQL comments but keep the statements
    sql = sql.replace(/--.*$/gm, '')
    
    // Split by semicolon to get individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    console.log(`🔧 Executing ${statements.length} SQL statements...`)
    const conn = await pool.getConnection()
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      try {
        const stmt = statements[i]
        await conn.query(stmt)
        successCount++
        process.stdout.write(`\r  [${i + 1}/${statements.length}] Statements executed...`)
      } catch (error) {
        // Ignore errors for ALTER TABLE operations that might fail if columns exist
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          successCount++
          process.stdout.write(`\r  [${i + 1}/${statements.length}] (Skipped duplicate)`)
        } else if (error.message.includes('IF NOT EXISTS')) {
          successCount++
          process.stdout.write(`\r  [${i + 1}/${statements.length}] (Handled)`)
        } else {
          errorCount++
          console.error(`\n❌ Error at statement ${i + 1}: ${error.message}`)
        }
      }
    }
    
    conn.release()
    
    console.log(`\n✅ Schema execution completed! (${successCount} successful, ${errorCount} errors)`)
    
    // Check production tables
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = 'aluminium_erp' 
       AND (TABLE_NAME = 'work_order' 
            OR TABLE_NAME LIKE 'production_%' 
            OR TABLE_NAME = 'machine_master' 
            OR TABLE_NAME = 'operator_master')`
    )
    
    console.log('\n📊 Production tables status:')
    if (tables.length > 0) {
      tables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`))
      console.log(`\n✅ ${tables.length} production tables created successfully!`)
    } else {
      console.log('  ⚠ No production tables found - check error log above')
    }
    
    await pool.end()
    process.exit(errorCount > 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ Fatal Error:', error.message)
    process.exit(1)
  }
}

runProductionSchema()