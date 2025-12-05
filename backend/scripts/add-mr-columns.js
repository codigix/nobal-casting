import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function addMaterialRequestColumns() {
  let connection

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Adding columns to material_request table                  ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aluminium_erp'
    }

    console.log('📡 Connecting to database:', dbConfig.database)
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connection established\n')

    console.log('1️⃣  Checking existing columns...')
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'material_request' AND TABLE_SCHEMA = ?`,
      [dbConfig.database]
    )

    const existingColumns = columns.map(c => c.COLUMN_NAME)
    console.log('   Current columns:', existingColumns.join(', '), '\n')

    const columnsToAdd = [
      { name: 'series_no', def: 'VARCHAR(100) NULL' },
      { name: 'transition_date', def: 'DATE NULL' },
      { name: 'purpose', def: 'VARCHAR(50) DEFAULT "purchase"' },
      { name: 'target_warehouse', def: 'VARCHAR(100) NULL' },
      { name: 'source_warehouse', def: 'VARCHAR(100) NULL' },
      { name: 'items_notes', def: 'TEXT NULL' }
    ]

    let addedCount = 0

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`2️⃣  Adding column: ${col.name}...`)
        await connection.execute(
          `ALTER TABLE material_request ADD COLUMN ${col.name} ${col.def}`
        )
        console.log(`    ✅ Column ${col.name} added\n`)
        addedCount++
      } else {
        console.log(`   ℹ️  Column ${col.name} already exists\n`)
      }
    }

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log(`║  ✅ Added ${addedCount} new columns                              ║`)
    console.log('╚════════════════════════════════════════════════════════════╝\n')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

addMaterialRequestColumns()
