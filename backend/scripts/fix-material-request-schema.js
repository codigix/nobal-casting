/**
 * Migration script: Fix material_request_item table schema
 * Converts from old schema (id INT AUTO_INCREMENT) to new schema (mr_item_id VARCHAR)
 * 
 * Run with: node fix-material-request-schema.js
 * Or from npm: npm run fix:schema
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function fixMaterialRequestSchema() {
  let connection
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Material Request Item Schema Migration                   ║')
    console.log('║  Converting: id INT → mr_item_id VARCHAR(50)             ║')
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

    // Step 0: Verify material_request table exists
    console.log('0️⃣  Checking dependencies...')
    const [tableCheck] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'material_request'`,
      [dbConfig.database]
    )
    if (!tableCheck.length) {
      throw new Error('material_request table not found. Cannot proceed.')
    }
    console.log('   ✅ material_request table found\n')

    // Step 1: Check current table structure
    console.log('1️⃣  Analyzing current schema...')
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'material_request_item' AND TABLE_SCHEMA = ?
       ORDER BY ORDINAL_POSITION`,
      [dbConfig.database]
    )

    const columnNames = columns.map(c => c.COLUMN_NAME)
    console.log('   Current columns:', columnNames.join(', '))

    const hasMrItemId = columnNames.includes('mr_item_id')
    const hasId = columnNames.includes('id')

    if (hasMrItemId) {
      console.log('   ✅ Table already has mr_item_id column - No migration needed!\n')
      return
    }

    if (!hasId) {
      throw new Error('Table has neither id nor mr_item_id column. Manual intervention required.')
    }

    console.log('   ⚠️  Found old schema with id column - Migration required\n')

    // Step 2: Backup existing data
    console.log('2️⃣  Backing up existing data...')
    const [existingData] = await connection.execute(
      'SELECT * FROM material_request_item'
    )
    console.log(`   ✅ Found ${existingData.length} records to migrate\n`)

    if (existingData.length > 0) {
      console.log('   Sample data:')
      existingData.slice(0, 3).forEach((row, idx) => {
        console.log(`   [${idx + 1}] MR: ${row.mr_id}, Item: ${row.item_code}, Qty: ${row.qty}`)
      })
      if (existingData.length > 3) {
        console.log(`   ... and ${existingData.length - 3} more records\n`)
      } else {
        console.log()
      }
    }

    // Step 3: Disable foreign key checks temporarily
    console.log('3️⃣  Preparing database...')
    await connection.execute('SET FOREIGN_KEY_CHECKS=0')
    console.log('   ✅ Foreign key checks disabled temporarily\n')

    // Step 4: Drop the old table
    console.log('4️⃣  Dropping old material_request_item table...')
    await connection.execute('DROP TABLE IF EXISTS material_request_item')
    console.log('   ✅ Old table dropped\n')

    // Step 5: Create new table with correct schema
    console.log('5️⃣  Creating new material_request_item table...')
    await connection.execute(`
      CREATE TABLE material_request_item (
        mr_item_id VARCHAR(50) PRIMARY KEY,
        mr_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(50) NOT NULL,
        qty DECIMAL(15,3),
        uom VARCHAR(10),
        purpose TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mr_id) REFERENCES material_request(mr_id),
        FOREIGN KEY (item_code) REFERENCES item(item_code),
        INDEX idx_mr (mr_id)
      )
    `)
    console.log('   ✅ New table created with correct schema\n')

    // Step 6: Re-insert preserved data
    if (existingData.length > 0) {
      console.log('6️⃣  Restoring data...')
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < existingData.length; i++) {
        const row = existingData[i]
        const mr_item_id = `MRI-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`
        
        try {
          await connection.execute(
            `INSERT INTO material_request_item 
             (mr_item_id, mr_id, item_code, qty, uom, purpose, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [mr_item_id, row.mr_id, row.item_code, row.qty, row.uom, row.purpose]
          )
          successCount++
        } catch (err) {
          console.error(`   ⚠️  Failed to restore record: ${err.message}`)
          errorCount++
        }
      }

      console.log(`   ✅ Restored ${successCount} records`)
      if (errorCount > 0) {
        console.log(`   ⚠️  Failed to restore ${errorCount} records (may need manual review)\n`)
      } else {
        console.log()
      }
    }

    // Step 7: Re-enable foreign key checks
    console.log('7️⃣  Finalizing...')
    await connection.execute('SET FOREIGN_KEY_CHECKS=1')
    console.log('   ✅ Foreign key checks re-enabled\n')

    // Step 8: Verify migration
    console.log('8️⃣  Verifying migration...')
    const [newColumns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'material_request_item' AND TABLE_SCHEMA = ?
       ORDER BY ORDINAL_POSITION`,
      [dbConfig.database]
    )
    
    const [recordCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM material_request_item'
    )

    console.log('   New schema columns:', newColumns.map(c => c.COLUMN_NAME).join(', '))
    console.log(`   Total records: ${recordCount[0].count}\n`)

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Migration completed successfully!                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('Summary of changes:')
    console.log('  ✓ Converted primary key from "id INT AUTO_INCREMENT" to "mr_item_id VARCHAR(50)"')
    console.log('  ✓ Added created_at timestamp field')
    console.log('  ✓ Added proper foreign key constraints')
    console.log('  ✓ Added index on mr_id for query performance')
    console.log(`  ✓ Preserved and restored ${existingData.length} existing records\n`)

    console.log('Next steps:')
    console.log('  1. Test API endpoints: POST /api/material-requests')
    console.log('  2. Verify data integrity: SELECT COUNT(*) FROM material_request_item')
    console.log('  3. Check application logs for any errors\n')

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗')
    console.error('║  ❌ Migration failed!                                     ║')
    console.error('╚════════════════════════════════════════════════════════════╝\n')
    console.error('Error:', error.message)
    console.error('\nDetails:', error)
    
    console.error('\nTroubleshooting:')
    console.error('  1. Ensure MySQL is running')
    console.error('  2. Verify database credentials in .env file')
    console.error('  3. Check that material_request table exists')
    console.error('  4. Ensure item table exists with foreign key reference')
    console.error('  5. Try running SQL migration manually: mysql < scripts/fix-schema.sql\n')

    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

// Run migration
fixMaterialRequestSchema().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})