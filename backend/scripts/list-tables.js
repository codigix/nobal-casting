import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

const db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

async function listTables() {
  const conn = await db.getConnection()
  const [tables] = await conn.query('SHOW TABLES')
  conn.release()
  await db.end()
  
  console.log('Tables in database:')
  tables.forEach(t => {
    const name = Object.values(t)[0]
    console.log(`  - ${name}`)
  })
}

listTables()
