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
  
  const tableName = process.argv[2] || 'production_plan'
  const [tables] = await conn.query(`SHOW TABLES LIKE ?`, [tableName])
  console.log('Tables found:', tables)
  
  if (tables.length > 0) {
    const [columns] = await conn.query(`DESCRIBE ${tableName}`)
    console.log(`\nCurrent columns in ${tableName}:`)
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
