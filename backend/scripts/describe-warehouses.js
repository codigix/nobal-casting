import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: 'backend/.env' })

async function describeWarehouses() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  })

  try {
    console.log('--- Table: warehouses ---')
    const [rows1] = await conn.execute('DESCRIBE warehouses')
    console.log(rows1)

    console.log('\n--- Table: stock_balance ---')
    const [rows2] = await conn.execute('DESCRIBE stock_balance')
    console.log(rows2)
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await conn.end()
  }
}

describeWarehouses()
