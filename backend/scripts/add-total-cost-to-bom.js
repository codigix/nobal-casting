import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

async function runMigration() {
  let connection
  try {
    connection = await mysql.createConnection(config)
    console.log('Connected to database')

    const queries = [
      `ALTER TABLE bom ADD COLUMN total_cost DECIMAL(18,6) DEFAULT 0`,
      `ALTER TABLE bom ADD INDEX idx_total_cost (total_cost)`
    ]

    for (const query of queries) {
      try {
        await connection.execute(query)
        console.log('✓ Executed:', query)
      } catch (error) {
        console.log('✗ Query error:', error.message)
      }
    }

    console.log('Migration completed!')
  } catch (error) {
    console.error('Migration failed:', error.message)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigration()
