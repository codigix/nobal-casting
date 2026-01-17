import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

async function debug() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })

    console.log('\n=== Latest Material Requests ===')
    const [mrs] = await conn.query('SELECT mr_id, status, purpose, department FROM material_request ORDER BY created_at DESC LIMIT 5')
    mrs.forEach(mr => {
      console.log(`MR: ${mr.mr_id} | Status: ${mr.status} | Purpose: ${mr.purpose} | Dept: ${mr.department}`)
    })

    console.log('\n=== Stock Ledger Entries (Last 10) ===')
    const [ledgers] = await conn.query(`
      SELECT item_code, warehouse_id, transaction_type, qty_in, qty_out, transaction_date, reference_name
      FROM stock_ledger
      ORDER BY transaction_date DESC
      LIMIT 10
    `)
    ledgers.forEach(l => {
      console.log(`${l.item_code} | ${l.transaction_type} | In: ${l.qty_in} | Out: ${l.qty_out} | Ref: ${l.reference_name} | Date: ${l.transaction_date}`)
    })

    console.log('\n=== Stock Balance (Aluminium Slug) ===')
    const [stocks] = await conn.query(`
      SELECT item_code, warehouse_id, current_qty, available_qty
      FROM stock_balance
      WHERE item_code LIKE '%SLUG%' OR item_code LIKE '%Aluminium%'
    `)
    stocks.forEach(s => {
      console.log(`${s.item_code} | Warehouse: ${s.warehouse_id} | Current: ${s.current_qty} | Available: ${s.available_qty}`)
    })

    conn.end()
  } catch (error) {
    console.error('Error:', error.message)
  }
}

debug()
