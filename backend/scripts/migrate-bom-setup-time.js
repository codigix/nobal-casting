import fs from 'fs'
import { createPool } from 'mysql2/promise'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function runMigration() {
  const pool = createPool({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'nobalcasting',
    port: 3306
  })

  try {
    const schemaPath = path.join(__dirname, 'add-setup-time-and-selling-rate-to-bom.sql')
    const sql = fs.readFileSync(schemaPath, 'utf-8')
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)

    const conn = await pool.getConnection()
    for (const statement of statements) {
      try {
        await conn.query(statement)
        console.log(`✅ Executed: ${statement.substring(0, 50)}...`)
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️ Field already exists, skipping...`)
        } else {
          console.error(`❌ Error executing statement: ${err.message}`)
        }
      }
    }
    conn.release()
    console.log('✅ Migration completed successfully')
    await pool.end()
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
