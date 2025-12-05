import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function fixRequestedByColumn() {
  let connection

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Material Request Schema Fix                               ║')
    console.log('║  Removing FK constraint from requested_by_id               ║')
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

    console.log('1️⃣  Checking table structure...')
    const [tableInfo] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'material_request'`,
      [dbConfig.database]
    )

    if (!tableInfo.length) {
      throw new Error('material_request table not found')
    }
    console.log('   ✅ material_request table found\n')

    console.log('2️⃣  Disabling foreign key checks...')
    await connection.execute('SET FOREIGN_KEY_CHECKS=0')
    console.log('   ✅ Foreign key checks disabled\n')

    console.log('3️⃣  Dropping foreign key constraint...')
    try {
      await connection.execute(
        `ALTER TABLE material_request DROP FOREIGN KEY material_request_ibfk_1`
      )
      console.log('   ✅ Foreign key constraint dropped\n')
    } catch (err) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ℹ️  Foreign key constraint not found (already removed)\n')
      } else {
        throw err
      }
    }

    console.log('4️⃣  Modifying requested_by_id column to VARCHAR...')
    try {
      await connection.execute(
        `ALTER TABLE material_request MODIFY requested_by_id VARCHAR(255) NOT NULL DEFAULT ''`
      )
      console.log('   ✅ Column modified to VARCHAR(255)\n')
    } catch (err) {
      if (err.code === 'ER_DUPLICATE_FIELDNAME') {
        console.log('   ℹ️  Column already VARCHAR\n')
      } else {
        throw err
      }
    }

    console.log('5️⃣  Re-enabling foreign key checks...')
    await connection.execute('SET FOREIGN_KEY_CHECKS=1')
    console.log('   ✅ Foreign key checks re-enabled\n')

    console.log('6️⃣  Verifying changes...')
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'material_request' AND COLUMN_NAME = 'requested_by_id' AND TABLE_SCHEMA = ?`,
      [dbConfig.database]
    )

    if (columns.length > 0) {
      console.log(`   ✅ Column type: ${columns[0].COLUMN_TYPE}\n`)
    }

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Migration completed successfully!                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('Summary:')
    console.log('  ✓ Removed foreign key constraint from requested_by_id')
    console.log('  ✓ Changed requested_by_id to VARCHAR(255)')
    console.log('  ✓ Now accepts any text value (contact names)\n')

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗')
    console.error('║  ❌ Migration failed!                                     ║')
    console.error('╚════════════════════════════════════════════════════════════╝\n')
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

fixRequestedByColumn().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
