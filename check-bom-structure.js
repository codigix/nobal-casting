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

async function checkStructure() {
  try {
    const tables = ['bom', 'bom_line', 'bom_raw_material', 'bom_operation']

    for (const table of tables) {
      console.log(`\n=== ${table} ===`)
      const [columns] = await db.execute(`DESCRIBE ${table}`)
      columns.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`)
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkStructure()
