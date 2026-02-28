import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

async function checkColumns() {
  let conn
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    })

    console.log('\n📋 Checking production_plan table...')
    const [cols] = await conn.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME="production_plan" ORDER BY ORDINAL_POSITION'
    )

    console.log('Production Plan Columns:')
    cols.forEach(c => console.log('  -', c.COLUMN_NAME))

    console.log('\n📋 Checking work_order table...')
    const [woCols] = await conn.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME="work_order" ORDER BY ORDINAL_POSITION'
    )

    console.log('Work Order Columns:')
    woCols.forEach(c => console.log('  -', c.COLUMN_NAME))
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    if (conn) await conn.end()
  }
}

checkColumns()
