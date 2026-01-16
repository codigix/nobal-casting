import mysql from 'mysql2/promise'

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
})

console.log('\n=== ITEMS TABLE COLUMNS ===')
const [cols] = await conn.query('DESC items')
console.table(cols)

console.log('\n=== BOM_LINE TABLE COLUMNS ===')
const [bomCols] = await conn.query('DESC bom_line')
console.table(bomCols)

await conn.end()
