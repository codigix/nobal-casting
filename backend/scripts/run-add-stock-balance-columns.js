import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function runMigration() {
  let connection
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'erp_user',
      password: process.env.DB_PASSWORD || 'erp_password',
      database: process.env.DB_NAME || 'nobalcasting'
    })

    console.log('Connected to database')

    const sqlFile = path.join(__dirname, 'add-stock-balance-in-out-columns.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')

    const statements = sql.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 80) + '...')
        try {
          await connection.execute(statement)
          console.log('✓ Success')
        } catch (e) {
          if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('✓ Column already exists')
          } else {
            throw e
          }
        }
      }
    }

    console.log('✓ Migration completed successfully')
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigration()
