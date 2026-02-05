import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') })

const db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
})

async function cleanup() {
  const conn = await db.getConnection()
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')
    
    console.log('Dropping redundant tables...')
    await conn.query('DROP TABLE IF EXISTS items')
    await conn.query('DROP TABLE IF EXISTS warehouse')
    
    console.log('Clearing master data tables...')
    const tablesToClear = ['item', 'item_barcode', 'item_supplier', 'item_customer_detail', 'item_dimension_parameter', 'warehouses', 'users']
    for (const table of tablesToClear) {
      await conn.query(`TRUNCATE TABLE ${table}`)
      console.log(`- Cleared ${table}`)
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1')
    console.log('Cleanup completed successfully.')
  } catch (err) {
    console.error('Cleanup failed:', err.message)
  } finally {
    conn.release()
    await db.end()
  }
}

cleanup()
