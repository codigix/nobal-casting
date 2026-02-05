import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: 'backend/.env' })

async function checkMasterData() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  })

  try {
    const tables = ['warehouse', 'warehouses', 'item', 'supplier', 'supplier_group', 'item_group', 'stock_balance']
    
    for (const table of tables) {
      try {
        const [rows] = await conn.execute(`SELECT COUNT(*) as count FROM ${table}`)
        console.log(`Table ${table}: ${rows[0].count} rows`)
      } catch (err) {
        console.log(`Table ${table}: Error or not found (${err.message})`)
      }
    }

    const [itemGroups] = await conn.execute('SELECT * FROM item_group LIMIT 20')
    console.log('\nSample Item Groups:', itemGroups)

    const [stockSummary] = await conn.execute('SELECT * FROM v_stock_balance_summary')
    console.log('\nStock Balance Summary View:', stockSummary)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await conn.end()
  }
}

checkMasterData()
