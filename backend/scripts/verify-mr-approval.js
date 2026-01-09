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

async function verify() {
  const conn = await pool.getConnection()
  try {
    console.log('Checking Material Request Approval Flow\n')

    const [mrs] = await conn.query(`
      SELECT mr_id, status, department, purpose, source_warehouse, 
             DATE(updated_at) as updated_date, updated_at
      FROM material_request 
      WHERE status IN ('approved', 'pending')
      ORDER BY updated_at DESC
      LIMIT 5
    `)

    console.log(`Found ${mrs.length} approved/pending MRs\n`)

    for (const mr of mrs) {
      console.log(`MR: ${mr.mr_id}`)
      console.log(`  Status: ${mr.status}`)
      console.log(`  Department: ${mr.department}`)
      console.log(`  Purpose: ${mr.purpose}`)
      console.log(`  Source Warehouse: ${mr.source_warehouse}`)
      console.log(`  Last Updated: ${mr.updated_at}`)

      const [items] = await conn.query(`
        SELECT item_code, qty FROM material_request_item WHERE mr_id = ?
      `, [mr.mr_id])

      console.log(`  Items: ${items.length}`)
      items.forEach(i => console.log(`    - ${i.item_code}: ${i.qty}`))

      const [ledger] = await conn.query(`
        SELECT COUNT(*) as count FROM stock_ledger 
        WHERE reference_name = ? AND reference_doctype = 'Material Request'
      `, [mr.mr_id])

      console.log(`  Ledger Entries: ${ledger[0].count}`)
      console.log()
    }

  } finally {
    conn.release()
    await pool.end()
  }
}

verify().catch(console.error)
