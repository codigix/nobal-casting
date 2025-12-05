import { createPool } from 'mysql2/promise'

const pool = createPool({
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'aluminium_erp'
})

async function checkTables() {
  try {
    const conn = await pool.getConnection()
    const [rows] = await conn.query('SHOW TABLES')
    conn.release()
    
    console.log('Existing tables in aluminium_erp database:')
    rows.forEach(row => {
      console.log('  -', Object.values(row)[0])
    })
    
    pool.end()
  } catch (error) {
    console.error('Error:', error.message)
    pool.end()
  }
}

checkTables()