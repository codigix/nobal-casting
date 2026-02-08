import mysql from 'mysql2/promise'

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
})

console.log('\n=== WORK ORDER OPERATION TABLE ===')
const [rows] = await conn.query('DESC work_order_operation')
console.table(rows)

await conn.end()
