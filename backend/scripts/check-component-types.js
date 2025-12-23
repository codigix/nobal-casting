import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting'
})

async function checkTypes() {
  const conn = await pool.getConnection()
  
  const [data] = await conn.execute(
    'SELECT raw_material_id, item_code, item_name, item_group, component_type, fg_sub_assembly FROM bom_raw_material'
  )
  
  conn.release()
  pool.end()
  
  console.log('\nBOM Raw Material Items - Field Values:\n')
  console.log('ID | Item Code | Item Group | Component Type | FG Sub Assembly')
  console.log('-'.repeat(80))
  
  data.forEach(row => {
    console.log(
      `${row.raw_material_id} | ${row.item_code} | ${row.item_group} | ${row.component_type || '(null)'} | ${row.fg_sub_assembly || '(null)'}`
    )
  })
  
  console.log('\n')
}

checkTypes()
