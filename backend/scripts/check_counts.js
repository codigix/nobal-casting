import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
})

async function checkCounts() {
  const tables = ['users', 'company', 'warehouse', 'item_group', 'supplier_group', 'uom', 'item', 'items']
  console.log('Row counts in master tables:')
  for (const table of tables) {
    try {
      const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${table}`)
      console.log(`  - ${table}: ${rows[0].count}`)
    } catch (err) {
      console.log(`  - ${table}: Error - ${err.message}`)
    }
  }
  await db.end()
}

checkCounts()
