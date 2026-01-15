import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function setupMaterialDeductionTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  })

  try {
    console.log('🔄 Setting up Material Deduction Flow tables...\n')

    const sqlFile = path.join(__dirname, 'add-material-deduction-flow.sql')
    const sqlStatements = fs.readFileSync(sqlFile, 'utf8').split(';').filter(s => s.trim())

    for (const statement of sqlStatements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement)
          console.log('✓', statement.substring(0, 60) + '...')
        } catch (err) {
          if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('✗ Error:', err.message)
          }
        }
      }
    }

    console.log('\n✅ Material Deduction Flow Setup Complete!')
    console.log('\nTables Created:')
    console.log('  1. material_allocation - Tracks allocated materials')
    console.log('  2. job_card_material_consumption - Tracks consumption per operation')
    console.log('  3. material_deduction_log - Audit trail of deductions')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  } finally {
    await connection.end()
  }
}

setupMaterialDeductionTables()
