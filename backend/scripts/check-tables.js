import { createPool } from 'mysql2/promise'

async function checkTables() {
  const pool = createPool({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'aluminium_erp',
    port: 3306
  })

  try {
    const conn = await pool.getConnection()
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'aluminium_erp' ORDER BY TABLE_NAME`
    )
    conn.release()

    console.log('📊 All tables in aluminium_erp database:\n')
    tables.forEach(t => console.log(`  ${t.TABLE_NAME}`))
    console.log(`\nTotal: ${tables.length} tables`)

    pool.end()
  } catch (error) {
    console.error('Error:', error.message)
  }
}

checkTables()