import mysql from 'mysql2/promise'

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
})

console.log('\n=== work_order.wo_id ===')
const [woId] = await conn.query('SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "work_order" AND COLUMN_NAME = "wo_id"')
console.table(woId)

console.log('\n=== job_card.job_card_id ===')
const [jcId] = await conn.query('SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "job_card" AND COLUMN_NAME = "job_card_id"')
console.table(jcId)

console.log('\n=== stock_balance columns ===')
const [sbCols] = await conn.query('SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "stock_balance"')
console.table(sbCols)

await conn.end()
