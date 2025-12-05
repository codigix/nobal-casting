import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

async function check() {
  const conn = await db.getConnection()
  const [cols] = await conn.query('DESCRIBE users')
  console.log('Users table columns:')
  cols.forEach(c => console.log(`  ${c.Field} (${c.Type})`))
  
  const [rows] = await conn.query('SELECT * FROM users LIMIT 1')
  console.log('\nSample user row:')
  if (rows.length > 0) {
    console.log(JSON.stringify(rows[0], null, 2))
  } else {
    console.log('  (No users found)')
  }
  
  await conn.release()
  await db.end()
}

check().catch(console.error)
