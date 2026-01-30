import mysql from 'mysql2/promise.js'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  waitForConnections: true
})

async function check() {
  const conn = await pool.getConnection()
  const tables = ['purchase_order', 'purchase_receipt', 'grn_requests', 'material_request']
  
  for (const t of tables) {
    console.log(`\nTable: ${t}`)
    try {
      const [cols] = await conn.query(`DESCRIBE ${t}`)
      cols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`))
    } catch (e) {
      console.log(`  Error: ${e.message}`)
    }
  }
  
  conn.release()
  pool.end()
}

check()
