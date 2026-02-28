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
    console.log('║  Job Card Material Request Link Migration                 ║')
    console.log('║  Adding mr_id and material_status fields                 ║')
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
    const sqlPath = path.join(__dirname, 'add-material-request-to-job-card.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8')
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log(`📋 Executing ${sqlStatements.length} SQL statements...\n`)

    for (const statement of sqlStatements) {
      try {
        console.log(`⏳ ${statement.substring(0, 60)}...`)
        await connection.execute(statement)
        console.log('   ✅ Success\n')
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || 
            err.code === 'ER_DUP_KEYNAME' ||
            err.message.includes('already exists') || 
            err.message.includes('Duplicate column name')) {
          console.log('   ⚠️  Already exists (skipping)\n')
        } else {
          throw err
        }
      }
    }

    // Verify migration
    console.log('🔍 Verifying migration...')
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'job_card' AND TABLE_SCHEMA = ?`,
      [dbConfig.database]
    )
    
    const columnNames = columns.map(c => c.COLUMN_NAME)
    const hasMrId = columnNames.includes('mr_id')
    const hasMaterialStatus = columnNames.includes('material_status')
    const hasMaterialReceivedDate = columnNames.includes('material_received_date')

    if (hasMrId && hasMaterialStatus && hasMaterialReceivedDate) {
      console.log('\n✅ Migration completed successfully!')
      console.log('   ✓ mr_id column added')
      console.log('   ✓ material_status column added')
      console.log('   ✓ material_received_date column added\n')
    } else {
      console.log('\n⚠️  Some columns may not have been created:')
      if (!hasMrId) console.log('   - mr_id missing')
      if (!hasMaterialStatus) console.log('   - material_status missing')
      if (!hasMaterialReceivedDate) console.log('   - material_received_date missing')
      console.log()
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) await connection.end()
  }
}

migrate()
