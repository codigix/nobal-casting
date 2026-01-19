import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  })

  try {
    console.log('🔄 Running stock movements migration...')

    // Read and execute the SQL file
    const sqlFile = path.join(__dirname, 'add-stock-movements-table.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')

    // Split SQL statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)

    for (const statement of statements) {
      try {
        await connection.query(statement)
        console.log('✅ Executed:', statement.substring(0, 60) + '...')
      } catch (err) {
        console.error('❌ Error executing statement:', err.message)
        throw err
      }
    }

    console.log('\n✨ Stock movements table migration completed successfully!')
    console.log('📋 Table: stock_movements')
    console.log('   - Supports IN, OUT, TRANSFER movement types')
    console.log('   - source_warehouse_id and target_warehouse_id for transfers')
    console.log('   - Proper indexes for performance')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

runMigration()
