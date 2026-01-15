import mysql from 'mysql2/promise'

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
})

console.log('\n=== WORK ORDER TABLE ===')
const [woRows] = await conn.query('DESC work_order')
console.table(woRows)

console.log('\n=== JOB CARD TABLE ===')
const [jcRows] = await conn.query('DESC job_card')
console.table(jcRows)

await conn.end()
