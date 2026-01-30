import mysql from 'mysql2/promise.js'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  waitForConnections: true
})

try {
  const conn = await pool.getConnection()
  const [columns] = await conn.query(`DESCRIBE item`)
  console.log('Columns in item:')
  columns.forEach(c => console.log(`  ${c.Field}: ${c.Type}`))
  conn.release()
  pool.end()
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
