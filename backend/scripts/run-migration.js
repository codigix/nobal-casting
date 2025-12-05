import { createPool } from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

async function runMigration() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aluminium_erp',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('Starting database migration...')
    
    // Read the migration file
    const scriptDir = path.dirname(new URL(import.meta.url).pathname)
    const migrationPath = path.join(scriptDir, 'fix-item-code-schema.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      console.log(`${statement.substring(0, 80)}...`)
      
      try {
        await db.execute(statement)
      } catch (e) {
        // Some errors are expected (like if columns don't exist), log but continue
        console.warn(`  Warning: ${e.message}`)
      }
    }
    
    console.log('✓ Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

runMigration()
