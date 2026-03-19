import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

async function main() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔧 Batch Code Migration - stock_ledger\n')

    // 1. Check if batch_no column exists in stock_ledger
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stock_ledger' AND COLUMN_NAME = 'batch_no' AND TABLE_SCHEMA = ?`,
      [process.env.DB_NAME || 'nobalcasting']
    )

    if (columns.length === 0) {
      console.log('🔧 Adding batch_no column to stock_ledger...')
      await db.execute('ALTER TABLE stock_ledger ADD COLUMN batch_no VARCHAR(100) AFTER transaction_value')
      console.log('✓ batch_no column added to stock_ledger')
    } else {
      console.log('✓ batch_no column already exists in stock_ledger')
    }

    console.log('\n🎉 Migration complete!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
