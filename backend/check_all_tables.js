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
  
  const tableNames = ['production_plan_fg', 'production_plan_sub_assembly', 'production_plan_raw_material']
  
  for (const tableName of tableNames) {
    const [tables] = await conn.query(`SHOW TABLES LIKE ?`, [tableName])
    
    if (tables.length > 0) {
      console.log(`\n✓ Table '${tableName}' exists`)
      const [columns] = await conn.query(`DESCRIBE ${tableName}`)
      console.log('Columns:')
      columns.forEach(c => console.log(`  ${c.Field}: ${c.Type}`))
    } else {
      console.log(`\n✗ Table '${tableName}' does NOT exist`)
    }
  }
  
  conn.release()
  pool.end()
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
