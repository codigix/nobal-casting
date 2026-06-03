import { createPool } from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

async function runUpgrade() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  })

  try {
    console.log('🚀 Running Selling Module AI Upgrade...')

    const schemaPath = path.join(process.cwd(), 'scripts', 'add-leads-and-rfqs.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    for (const statement of statements) {
      try {
        // Replace SERIAL with BIGINT AUTO_INCREMENT and JSONB with JSON for MySQL compatibility
        let mysqlStmt = statement
          .replace(/SERIAL PRIMARY KEY/g, 'BIGINT AUTO_INCREMENT PRIMARY KEY')
          .replace(/JSONB/g, 'JSON')
        
        await db.execute(mysqlStmt)
        console.log('✓ Executed statement')
      } catch (error) {
        console.error('✗ Error executing statement:', error.message)
      }
    }

    console.log('✅ Selling Module AI Upgrade completed!')
    await db.end()
  } catch (error) {
    console.error('❌ Upgrade failed:', error)
    process.exit(1)
  }
}

runUpgrade()
