#!/usr/bin/env node
import { createPool } from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aluminium_erp',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  try {
    console.log('📝 Starting database schema migration...')
    console.log(`Database: ${process.env.DB_NAME || 'aluminium_erp'}`)
    console.log(`Host: ${process.env.DB_HOST || 'localhost'}\n`)
    
    const migrationFile = path.join(__dirname, 'scripts', 'fix-item-code-schema.sql')
    const sql = fs.readFileSync(migrationFile, 'utf8')
    
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`)
    
    let successCount = 0
    let warningCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const displayText = statement.substring(0, 70).replace(/\n/g, ' ')
      process.stdout.write(`[${i + 1}/${statements.length}] ${displayText}... `)
      
      try {
        await db.execute(statement)
        console.log('✓')
        successCount++
      } catch (err) {
        if (err.message.includes("already exists") || 
            err.message.includes("doesn't have a default value") ||
            err.message.includes("Duplicate key name") ||
            err.message.includes("Unknown column")) {
          console.log(`⚠️  (${err.message.substring(0, 50)})`)
          warningCount++
        } else {
          console.log(`✗`)
          throw err
        }
      }
    }
    
    console.log(`\n✅ Migration completed!`)
    console.log(`   ✓ Successful: ${successCount}`)
    console.log(`   ⚠️  Warnings: ${warningCount}`)
    
    process.exit(0)
  } catch (err) {
    console.error(`\n❌ Migration failed!`)
    console.error(`   Error: ${err.message}`)
    console.error(err.code)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
