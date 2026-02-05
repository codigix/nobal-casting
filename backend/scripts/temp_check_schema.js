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

async function check() {
  try {
    const [item] = await db.query('DESCRIBE item')
    console.log('ITEM table columns:')
    console.table(item.map(c => ({ Field: c.Field, Type: c.Type })))


    const [stock_balance] = await db.query('DESCRIBE stock_balance')
    console.log('stock_balance table columns:')
    console.table(stock_balance.map(c => ({ Field: c.Field, Type: c.Type })))

    const [stock_ledger] = await db.query('DESCRIBE stock_ledger')
    console.log('stock_ledger table columns:')
    console.table(stock_ledger.map(c => ({ Field: c.Field, Type: c.Type })))

    const [stock_entries] = await db.query('DESCRIBE stock_entries')
    console.log('stock_entries table columns:')
    console.table(stock_entries.map(c => ({ Field: c.Field, Type: c.Type })))

    const [fks] = await db.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = ? AND TABLE_NAME IN ('stock_balance', 'stock_ledger', 'stock_entries', 'stock_entry_items')
    `, [process.env.DB_NAME])
    console.log('Foreign Keys for stock tables:')
    console.table(fks)

  } catch (err) {
    console.error(err.message)
  } finally {
    await db.end()
  }
}

check()
