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

    const [cols] = await conn.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME="job_card" ORDER BY ORDINAL_POSITION'
    )

    console.log('Job Card Columns:')
    cols.forEach(c => console.log('  -', c.COLUMN_NAME))

    const hasMrId = cols.some(c => c.COLUMN_NAME === 'mr_id')
    const hasMaterialStatus = cols.some(c => c.COLUMN_NAME === 'material_status')
    const hasMaterialReceivedDate = cols.some(c => c.COLUMN_NAME === 'material_received_date')

    console.log('\nMissing Columns:')
    if (!hasMrId) console.log('  ✗ mr_id')
    if (!hasMaterialStatus) console.log('  ✗ material_status')
    if (!hasMaterialReceivedDate) console.log('  ✗ material_received_date')

    if (hasMrId && hasMaterialStatus && hasMaterialReceivedDate) {
      console.log('  ✓ All required columns present!')
    }
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    if (conn) await conn.end()
  }
}

checkColumns()
