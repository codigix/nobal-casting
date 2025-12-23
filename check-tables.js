import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: './backend/.env' })

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'erp_user',
  password: process.env.DB_PASSWORD || 'erp_password',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306
})

async function checkTables() {
  try {
    const [tables] = await db.execute(`SHOW TABLES`)
    console.log('All tables in database:')
    tables.forEach(row => {
      const tableName = Object.values(row)[0]
      if (tableName.toLowerCase().includes('bom') || tableName.toLowerCase().includes('production')) {
        console.log(`  ${tableName}`)
      }
    })
    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkTables()
