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

async function debug() {
  const conn = await pool.getConnection()
  try {
    console.log('=== Debugging MR Approval Flow ===\n')

    // Get a recent approved MR with source_warehouse set
    const [mrs] = await conn.query(`
      SELECT mr_id, status, source_warehouse FROM material_request 
      WHERE status = 'approved' AND source_warehouse IS NOT NULL
      ORDER BY updated_at DESC LIMIT 1
    `)

    if (mrs.length === 0) {
      console.log('No approved MRs with source warehouse found')
      return
    }

    const mr = mrs[0]
    console.log(`Testing with MR: ${mr.mr_id}`)
    console.log(`Status: ${mr.status}`)
    console.log(`Source Warehouse: ${mr.source_warehouse}\n`)

    // Get warehouse details
    const [warehouses] = await conn.query(`
      SELECT id, warehouse_code, warehouse_name FROM warehouses
    `)

    console.log('Available Warehouses:')
    warehouses.forEach(w => {
      console.log(`  - ${w.id}: ${w.warehouse_code} / ${w.warehouse_name}`)
    })

    const sourceWh = warehouses.find(w => 
      w.id == mr.source_warehouse || 
      w.warehouse_code == mr.source_warehouse || 
      w.warehouse_name == mr.source_warehouse
    )

    console.log(`\nMatched Warehouse: ${sourceWh ? sourceWh.id + ' - ' + sourceWh.warehouse_name : 'NOT FOUND'}`)

    // Get items and check stock balance
    const [items] = await conn.query(`
      SELECT item_code, qty FROM material_request_item WHERE mr_id = ?
    `, [mr.mr_id])

    console.log(`\nMR Items (${items.length}):`)

    for (const item of items) {
      console.log(`\n  Item: ${item.item_code} (Requested: ${item.qty})`)

      const [stock] = await conn.query(`
        SELECT sb.*, w.warehouse_name
        FROM stock_balance sb
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        WHERE sb.item_code = ?
      `, [item.item_code])

      if (stock.length === 0) {
        console.log(`    ❌ No stock balance found`)
      } else {
        stock.forEach(s => {
          console.log(`    Warehouse: ${s.warehouse_name} (ID: ${s.warehouse_id})`)
          console.log(`      Current Qty: ${s.current_qty}`)
          console.log(`      Available Qty: ${s.available_qty}`)
          console.log(`      Valuation Rate: ${s.valuation_rate}`)
        })
      }

      // Check if there are any ledger entries for this item/mr combination
      const [ledger] = await conn.query(`
        SELECT sl.*, w.warehouse_name
        FROM stock_ledger sl
        LEFT JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE sl.item_code = ? AND sl.reference_name = ?
        ORDER BY sl.id DESC
      `, [item.item_code, mr.mr_id])

      if (ledger.length === 0) {
        console.log(`    ⚠️  No ledger entries found`)
      } else {
        console.log(`    ✓ Ledger entries: ${ledger.length}`)
        ledger.slice(0, 2).forEach((l, idx) => {
          console.log(`      [${idx + 1}] ${l.transaction_type}: In=${l.qty_in}, Out=${l.qty_out}, Balance=${l.balance_qty}`)
        })
      }
    }

  } finally {
    conn.release()
    await pool.end()
  }
}

debug().catch(console.error)
