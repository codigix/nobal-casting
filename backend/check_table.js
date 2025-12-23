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
  
  const [tables] = await conn.query(`SHOW TABLES LIKE 'production_plan'`)
  console.log('Tables found:', tables)
  
  if (tables.length > 0) {
    const [columns] = await conn.query(`DESCRIBE production_plan`)
    console.log('\nCurrent columns in production_plan:')
    columns.forEach(c => console.log(`  ${c.Field}: ${c.Type}`))
  } else {
    console.log('Table does not exist')
  }
  
  conn.release()
  pool.end()
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
