import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting'
})

async function checkLedger() {
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.query(`
      SELECT id, item_code, transaction_type, qty_in, qty_out, 
             reference_name, reference_doctype, transaction_date
      FROM stock_ledger 
      WHERE reference_doctype = 'Material Request' 
      ORDER BY id DESC 
      LIMIT 15
    `)

    console.log('Stock Ledger Entries for Material Requests:')
    if (rows.length === 0) {
      console.log('  ❌ No entries found')
    } else {
      rows.forEach(r => {
        console.log(`  [${r.id}] ${r.item_code}`)
        console.log(`      Type: ${r.transaction_type}`)
        console.log(`      In: ${r.qty_in}, Out: ${r.qty_out}`)
        console.log(`      Reference: ${r.reference_name} (${r.reference_doctype})`)
        console.log(`      Date: ${r.transaction_date}`)
      })
    }

    const [summary] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT reference_name) as unique_refs,
        COUNT(DISTINCT item_code) as unique_items,
        SUM(qty_out) as total_qty_out,
        SUM(qty_in) as total_qty_in
      FROM stock_ledger 
      WHERE reference_doctype = 'Material Request'
    `)

    console.log('\nSummary:')
    console.log(`  Total Entries: ${summary[0].total}`)
    console.log(`  Unique MRs: ${summary[0].unique_refs}`)
    console.log(`  Unique Items: ${summary[0].unique_items}`)
    console.log(`  Total Qty In: ${summary[0].total_qty_in}`)
    console.log(`  Total Qty Out: ${summary[0].total_qty_out}`)

  } finally {
    conn.release()
    await pool.end()
  }
}

checkLedger().catch(console.error)
