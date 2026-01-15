import mysql from 'mysql2/promise'

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
})

const [rows] = await conn.query('SHOW TABLES LIKE "material_%"')
console.log('Material Tables:')
console.table(rows)

const [tbls] = await conn.query('SHOW TABLES LIKE "job_card_material%"')
console.log('\nJob Card Material Tables:')
console.table(tbls)

await conn.end()
