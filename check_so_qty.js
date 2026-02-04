import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_password',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306
})

async function check() {
  try {
    const [rows] = await db.execute('SELECT sales_order_id, qty, quantity, items FROM selling_sales_order ORDER BY created_at DESC LIMIT 5')
    console.log(JSON.stringify(rows, null, 2))
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
check()
