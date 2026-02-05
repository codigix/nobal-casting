import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: 'backend/.env' })

async function describeItem() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  })

  try {
    const [rows] = await conn.execute('DESCRIBE item')
    console.log(rows)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await conn.end()
  }
}

describeItem()
