/**
 * Debug Script: Check if Stock Updates are Happening for Approved Material Requests
 */

import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function debugStockUpdates() {
  const connection = await pool.getConnection()
  try {
    console.log('\n=== Debug: Stock Updates for Approved Material Requests ===\n')

    // Get all approved material_issue MRs
    const [approvedMRs] = await connection.query(`
      SELECT 
        mr.mr_id,
        mr.purpose,
        mr.status,
        mr.source_warehouse,
        mr.created_at,
        mr.updated_at,
        COUNT(mri.mr_item_id) as item_count
      FROM material_request mr
      LEFT JOIN material_request_item mri ON mr.mr_id = mri.mr_id
      WHERE mr.purpose = 'material_issue' AND mr.status = 'approved'
      GROUP BY mr.mr_id
      ORDER BY mr.updated_at DESC
      LIMIT 5
    `)

    console.log(`Found ${approvedMRs.length} approved material_issue requests:\n`)

    for (const mr of approvedMRs) {
      console.log(`MR: ${mr.mr_id}`)
      console.log(`  Status: ${mr.status}, Purpose: ${mr.purpose}`)
      console.log(`  Source Warehouse: ${mr.source_warehouse}`)
      console.log(`  Items: ${mr.item_count}`)
      console.log(`  Updated at: ${mr.updated_at}`)

      // Get items in this MR
      const [mrItems] = await connection.query(`
        SELECT mri.item_code, mri.qty, i.name as item_name
        FROM material_request_item mri
        LEFT JOIN item i ON mri.item_code = i.item_code
        WHERE mri.mr_id = ?
      `, [mr.mr_id])

      console.log(`\n  Items in this MR:`)
      for (const item of mrItems) {
        console.log(`    • ${item.item_code} (${item.item_name}): ${item.qty}`)

        // Check stock_balance for this item
        const [stocks] = await connection.query(`
          SELECT 
            sb.item_code,
            sb.warehouse_id,
            w.warehouse_name,
            sb.current_qty,
            sb.available_qty,
            sb.last_issue_date,
            sb.updated_at
          FROM stock_balance sb
          LEFT JOIN warehouses w ON sb.warehouse_id = w.id
          WHERE sb.item_code = ?
        `, [item.item_code])

        if (stocks.length > 0) {
          console.log(`      Stock Balance:`)
          for (const sb of stocks) {
            console.log(`        Warehouse: ${sb.warehouse_name}`)
            console.log(`        Current Qty: ${sb.current_qty}, Available: ${sb.available_qty}`)
            console.log(`        Last Issue Date: ${sb.last_issue_date}`)
          }
        } else {
          console.log(`      ⚠️  No stock_balance record found!`)
        }

        // Check ledger for this MR and item
        const [ledgers] = await connection.query(`
          SELECT 
            sl.id,
            sl.transaction_type,
            sl.qty_out,
            sl.balance_qty,
            sl.reference_name,
            sl.created_at
          FROM stock_ledger sl
          WHERE sl.item_code = ? AND sl.reference_name = ?
        `, [item.item_code, mr.mr_id])

        if (ledgers.length > 0) {
          console.log(`      Ledger Entries: ${ledgers.length}`)
          for (const ledger of ledgers) {
            console.log(`        Type: ${ledger.transaction_type}, Qty Out: ${ledger.qty_out}, Balance: ${ledger.balance_qty}`)
          }
        } else {
          console.log(`      ⚠️  No stock_ledger entry found for this MR!`)
        }
      }
      console.log('\n')
    }

    console.log('\n=== Analysis Complete ===')
    console.log('\nIf stock_ledger entries are missing but status is "approved":')
    console.log('1. Check backend logs for errors during approval')
    console.log('2. The stock may have been deducted from stock_balance but ledger not created')
    console.log('3. A code path might be skipping ledger creation')

  } catch (error) {
    console.error('Debug failed:', error.message)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

debugStockUpdates().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
