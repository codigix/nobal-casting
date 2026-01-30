import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true
})

async function checkSchemas() {
  try {
    const conn = await pool.getConnection()
    
    console.log('--- material_request ---')
    const [mrCols] = await conn.query('DESCRIBE material_request')
    mrCols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`))

    console.log('\n--- grn_requests ---')
    const [grnCols] = await conn.query('DESCRIBE grn_requests')
    grnCols.forEach(c => console.log(`  ${c.Field}: ${c.Type}`))
    
    console.log('\n--- material_request data ---')
    const [rows] = await conn.query('SELECT mr_id, requested_by_id, created_by FROM material_request LIMIT 5')
    console.log(rows)
    
    conn.release()
    await pool.end()
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkSchemas()
