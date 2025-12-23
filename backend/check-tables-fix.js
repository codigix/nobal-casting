import mysql from 'mysql2/promise'

async function checkTables() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  const [rows] = await conn.execute(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA='nobalcasting' 
    ORDER BY TABLE_NAME
  `)

  console.log(`Found ${rows.length} tables:\n`)
  rows.forEach(r => console.log(`  - ${r.TABLE_NAME}`))

  conn.end()
}

checkTables().catch(err => console.error('Error:', err.message))
