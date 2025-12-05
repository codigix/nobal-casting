import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function addAuditFields() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'aluminium_erp',
    port: process.env.DB_PORT || 3306
  })

  const tables = [
    'supplier_quotation',
    'material_request',
    'rfq',
    'purchase_order',
    'purchase_receipt',
    'purchase_invoice'
  ]

  try {
    console.log('🔧 Adding audit fields (created_by, updated_by) to tables...\n')

    for (const table of tables) {
      try {
        // Check if columns exist
        const [columns] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = '${table}' AND COLUMN_NAME IN ('created_by', 'updated_by')`
        )

        if (columns.length < 2) {
          console.log(`⚙️  Updating ${table}...`)
          
          // Add created_by if missing
          if (!columns.find(c => c.COLUMN_NAME === 'created_by')) {
            await connection.execute(
              `ALTER TABLE ${table} ADD COLUMN created_by VARCHAR(100) AFTER created_at`
            )
            console.log(`  ✓ Added created_by column`)
          }

          // Add updated_by if missing
          if (!columns.find(c => c.COLUMN_NAME === 'updated_by')) {
            await connection.execute(
              `ALTER TABLE ${table} ADD COLUMN updated_by VARCHAR(100) AFTER updated_at`
            )
            console.log(`  ✓ Added updated_by column`)
          }
        } else {
          console.log(`✓ ${table} already has audit fields`)
        }
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('Duplicate')) {
          console.log(`ℹ️  ${table}: audit fields already exist`)
        } else if (err.message.includes('no such table')) {
          console.log(`⚠️  Table ${table} does not exist (skipping)`)
        } else {
          console.error(`❌ Error updating ${table}:`, err.message)
        }
      }
    }

    console.log('\n✓ Audit fields update completed!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

addAuditFields()