/**
 * Migration script: Fix item table schema
 * Adds missing columns: item_group, hsn_code, gst_rate
 * Renames category to item_group if needed
 * 
 * Run with: node fix-item-schema.js
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function fixItemSchema() {
  let connection

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Item Table Schema Migration                              ║')
    console.log('║  Adding missing columns: item_group, hsn_code, gst_rate  ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'aluminium_erp'
    }

    console.log('📡 Connecting to database:', dbConfig.database)
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connection established\n')

    // Step 1: Analyze current schema
    console.log('1️⃣  Analyzing current item table schema...')
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'item' AND TABLE_SCHEMA = ?
       ORDER BY ORDINAL_POSITION`,
      [dbConfig.database]
    )

    const columnNames = columns.map(c => c.COLUMN_NAME)
    console.log('   Current columns:', columnNames.join(', '))

    const hasItemGroup = columnNames.includes('item_group')
    const hasHsnCode = columnNames.includes('hsn_code')
    const hasGstRate = columnNames.includes('gst_rate')
    const hasCategory = columnNames.includes('category')

    // Check if already migrated
    if (hasItemGroup && hasHsnCode && hasGstRate) {
      console.log('   ✅ Table already has all required columns - No migration needed!\n')
      return
    }

    console.log('   ⚠️  Missing columns detected - Migration required\n')

    // Step 2: Check existing data
    console.log('2️⃣  Checking existing data...')
    const [itemCount] = await connection.execute('SELECT COUNT(*) as count FROM item')
    console.log(`   Total items: ${itemCount[0].count}\n`)

    // Step 3: Start migration
    console.log('3️⃣  Starting migration...')

    // If category exists but item_group doesn't, rename it
    if (hasCategory && !hasItemGroup) {
      console.log('   📝 Renaming category → item_group...')
      await connection.execute(`ALTER TABLE item CHANGE COLUMN category item_group VARCHAR(100)`)
      console.log('   ✅ Renamed successfully\n')
    } else if (!hasItemGroup) {
      console.log('   ➕ Adding item_group column...')
      await connection.execute(`ALTER TABLE item ADD COLUMN item_group VARCHAR(100) AFTER name`)
      console.log('   ✅ Added successfully\n')
    }

    // Add hsn_code if missing
    if (!hasHsnCode) {
      console.log('   ➕ Adding hsn_code column...')
      await connection.execute(`ALTER TABLE item ADD COLUMN hsn_code VARCHAR(20) AFTER uom`)
      console.log('   ✅ Added successfully\n')
    }

    // Add gst_rate if missing
    if (!hasGstRate) {
      console.log('   ➕ Adding gst_rate column...')
      await connection.execute(`ALTER TABLE item ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT 0 AFTER hsn_code`)
      console.log('   ✅ Added successfully\n')
    }

    // Step 4: Verify migration
    console.log('4️⃣  Verifying migration...')
    const [newColumns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'item' AND TABLE_SCHEMA = ?
       ORDER BY ORDINAL_POSITION`,
      [dbConfig.database]
    )

    const newColumnNames = newColumns.map(c => c.COLUMN_NAME)
    console.log('   Final columns:', newColumnNames.join(', '))
    console.log()

    // Verify required columns exist
    const requiredCols = ['item_group', 'hsn_code', 'gst_rate']
    const missingCols = requiredCols.filter(col => !newColumnNames.includes(col))

    if (missingCols.length > 0) {
      throw new Error(`Migration incomplete - Missing columns: ${missingCols.join(', ')}`)
    }

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Migration completed successfully!                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('Summary of changes:')
    if (hasCategory && !hasItemGroup) {
      console.log('  ✓ Renamed category column to item_group')
    } else if (!hasItemGroup) {
      console.log('  ✓ Added item_group column')
    }
    if (!hasHsnCode) {
      console.log('  ✓ Added hsn_code column')
    }
    if (!hasGstRate) {
      console.log('  ✓ Added gst_rate column')
    }
    console.log()

    console.log('Next steps:')
    console.log('  1. Test API endpoints: GET /api/items/groups')
    console.log('  2. Verify item data: SELECT * FROM item LIMIT 1')
    console.log('  3. Restart backend service\n')

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗')
    console.error('║  ❌ Migration failed!                                     ║')
    console.error('╚════════════════════════════════════════════════════════════╝\n')
    console.error('Error:', error.message)
    console.error('\nDetails:', error)

    console.error('\nTroubleshooting:')
    console.error('  1. Ensure MySQL is running')
    console.error('  2. Verify database credentials in .env file')
    console.error('  3. Check that item table exists')
    console.error('  4. Try running SQL directly:\n')
    console.error('     ALTER TABLE item ADD COLUMN item_group VARCHAR(100) AFTER name;')
    console.error('     ALTER TABLE item ADD COLUMN hsn_code VARCHAR(20) AFTER uom;')
    console.error('     ALTER TABLE item ADD COLUMN gst_rate DECIMAL(5,2) DEFAULT 0 AFTER hsn_code;\n')

    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

// Run migration
fixItemSchema().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})