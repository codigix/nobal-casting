import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
})

async function listUsers() {
  try {
    const [rows] = await db.query('SELECT user_id, full_name, email, role FROM users')
    console.table(rows)
  } catch (err) {
    console.error(err)
  }
  await db.end()
}

listUsers()
