import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: 'backend/.env' })

async function truncateItem() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  })

  try {
    console.log('Truncating item and related tables...')
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0')

    const tables = [
      'item',
      'item_barcode',
      'item_customer_detail',
      'item_dimension_parameter',
      'item_supplier',
      'stock',
      'stock_balance',
      'stock_ledger'
    ]

    for (const table of tables) {
      try {
        await conn.execute(`TRUNCATE TABLE ${table}`)
        console.log(`✓ Truncated ${table}`)
      } catch (err) {
        console.log(`- Error/Skipped ${table}: ${err.message}`)
      }
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1')
    console.log('\n✓ Item-related tables truncated successfully!')
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await conn.end()
  }
}

truncateItem()
