import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp'
}

async function verifyTables() {
  let connection
  try {
    connection = await mysql.createConnection(config)
    
    const requiredTables = [
      'work_order',
      'work_order_item',
      'work_order_operation',
      'job_card'
    ]

    console.log('Verifying database tables...\n')

    for (const table of requiredTables) {
      try {
        const [rows] = await connection.query(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
          [process.env.DB_NAME || 'aluminium_erp', table]
        )
        
        if (rows.length > 0) {
          console.log(`✓ Table '${table}' exists`)
        } else {
          console.log(`✗ Table '${table}' NOT found`)
        }
      } catch (error) {
        console.log(`✗ Error checking '${table}':`, error.message)
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('Connection error:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

verifyTables()
