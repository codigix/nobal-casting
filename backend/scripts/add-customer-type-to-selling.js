import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
}

async function migrate() {
  const connection = await mysql.createConnection(config)
  console.log('Connected to database')

  try {
    // 1. Check if column exists
    const [columns] = await connection.execute('SHOW COLUMNS FROM selling_customer LIKE "customer_type"')
    
    if (columns.length === 0) {
      console.log('Adding customer_type column to selling_customer table...')
      await connection.execute('ALTER TABLE selling_customer ADD COLUMN customer_type VARCHAR(50) DEFAULT "other" AFTER name')
      console.log('Column added successfully')
    } else {
      console.log('customer_type column already exists')
    }

    // 2. Add some test data for Tata
    console.log('Updating test data for Tata projects...')
    await connection.execute('UPDATE selling_customer SET customer_type = "tata" WHERE name LIKE "%Tata%" OR name LIKE "%TATA%"')
    console.log('Data updated successfully')

  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await connection.end()
    console.log('Database connection closed')
  }
}

migrate()
