import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

async function checkSchema() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })

    const [rows] = await conn.query('DESCRIBE stock_balance')
    console.log('\n=== stock_balance columns ===')
    rows.forEach(r => console.log(`${r.Field} (${r.Type})`))

    const [rows2] = await conn.query('DESCRIBE stock_ledger')
    console.log('\n=== stock_ledger columns ===')
    rows2.forEach(r => console.log(`${r.Field} (${r.Type})`))

    conn.end()
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkSchema()
