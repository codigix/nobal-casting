import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

async function main() {
  const db = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  })

  try {
    const [columns] = await db.query(`DESCRIBE stock_ledger`)
    console.log('Columns in stock_ledger:')
    console.table(columns)
    
    const hasBatchNo = columns.some(c => c.Field === 'batch_no')
    console.log(`\nHas batch_no: ${hasBatchNo ? '✅ YES' : '❌ NO'}`)
    
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
