import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function checkTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'aluminium_erp',
    port: process.env.DB_PORT || 3306
  })

  try {
    const [result] = await connection.query('DESCRIBE supplier_quotation_item')
    console.log('📋 supplier_quotation_item table structure:')
    result.forEach(row => {
      console.log(`  - ${row.Field}: ${row.Type}`)
    })
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await connection.end()
  }
}

checkTable()