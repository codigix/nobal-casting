import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function migrate() {
  let connection
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Complete Job Card Schema Fix Migration                   ║')
    console.log('║  Adding all required columns for ProductionModel         ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'nobalcasting',
      port: process.env.DB_PORT || 3306
    }

    console.log('📡 Connecting to database:', dbConfig.database)
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connection established\n')

    // Read and execute SQL migration
    const sqlPath = path.join(__dirname, 'fix-job-card-schema-complete.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📋 Executing ${sqlStatements.length} SQL statements...\n`)

    for (let statement of sqlStatements) {
      try {
        // Handle IF NOT EXISTS for ADD COLUMN in older MySQL versions
        // If it's a statement with IF NOT EXISTS, we try to execute it as-is
        // If it fails with a syntax error, it might be due to MySQL version not supporting IF NOT EXISTS in ALTER TABLE
        
        console.log(`⏳ ${statement.substring(0, 60)}...`)
        await connection.execute(statement)
        console.log('   ✅ Success\n')
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || 
            err.code === 'ER_DUP_KEYNAME' ||
            err.message.includes('already exists') || 
            err.message.includes('Duplicate column name') ||
            err.message.includes('Duplicate key name')) {
          console.log('   ⚠️  Already exists (skipping)\n')
        } else if (err.code === 'ER_PARSE_ERROR' && statement.includes('IF NOT EXISTS')) {
            // Fallback for MySQL versions that don't support IF NOT EXISTS in ALTER TABLE
            const simpleStatement = statement.replace('IF NOT EXISTS ', '')
            try {
              console.log(`⏳ Attempting fallback: ${simpleStatement.substring(0, 60)}...`)
              await connection.execute(simpleStatement)
              console.log('   ✅ Success (fallback)\n')
            } catch (fallbackErr) {
              if (fallbackErr.code === 'ER_DUP_FIELDNAME' || fallbackErr.message.includes('Duplicate column name')) {
                console.log('   ⚠️  Already exists (skipping fallback)\n')
              } else {
                throw fallbackErr
              }
            }
        } else {
          throw err
        }
      }
    }

    console.log('\n✅ Migration completed successfully!\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) await connection.end()
  }
}

migrate()
