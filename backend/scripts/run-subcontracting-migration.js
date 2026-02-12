import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function runMigration() {
  const connection = await pool.getConnection()
  try {
    const sqlPath = path.join(__dirname, 'add-subcontracting-workflow.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    const queries = sql.split(';').filter(query => query.trim() !== '')

    console.log('Running subcontracting workflow migration...')

    for (const query of queries) {
      try {
        await connection.execute(query)
        console.log(`✓ Success: ${query.substring(0, 50)}...`)
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_FK_DUP_NAME' || err.code === 'ER_DUP_KEYNAME') {
          console.log(`- Already exists: ${query.substring(0, 50)}...`)
        } else {
          console.error(`✗ Error: ${err.message}`)
          // We don't throw here to allow other queries to run if some already succeeded
        }
      }
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    connection.release()
    await pool.end()
  }
}

runMigration()
