import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: 'backend/.env' })

async function updateEnum() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: Number(process.env.DB_PORT) || 3307,
  })

  try {
    console.log('Updating stock_entries.entry_type ENUM...')

    // Check current enum values if possible or just alter
    await conn.execute(`
      ALTER TABLE stock_entries 
      MODIFY COLUMN entry_type ENUM(
        'Material Receipt', 
        'Material Issue', 
        'Material Transfer', 
        'Manufacturing Return', 
        'Repack', 
        'Scrap Entry',
        'Purchase'
      ) NOT NULL
    `)

    console.log('✓ stock_entries.entry_type updated successfully to include "Purchase"')

    // Also update ledger transaction type if it was an enum, but it's not (it's enum but let's check init.sql again)
    // Actually stock_ledger.transaction_type is also an enum in schema.sql
    /*
    transaction_type ENUM('Purchase Receipt', 'Issue', 'Transfer', 'Manufacturing Return', 'Repack', 'Scrap Entry', 'Reconciliation', 'Adjustment') NOT NULL,
    */
    // 'Purchase Receipt' already exists, so it's fine.

    console.log('\nMigration completed successfully!')

  } catch (error) {
    console.error('Migration failed:', error.message)
  } finally {
    await conn.end()
  }
}

updateEnum()
