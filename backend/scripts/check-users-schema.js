import { createPool } from 'mysql2/promise'

const pool = createPool({
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'aluminium_erp'
})

async function checkSchema() {
  try {
    const conn = await pool.getConnection()
    const [rows] = await conn.query('DESCRIBE users')
    conn.release()
    
    console.log('Schema of users table:')
    rows.forEach(row => {
      console.log(`  ${row.Field}: ${row.Type} ${row.Key ? '(KEY: ' + row.Key + ')' : ''}`)
    })
    
    pool.end()
  } catch (error) {
    console.error('Error:', error.message)
    pool.end()
  }
}

checkSchema()