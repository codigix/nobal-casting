import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

async function runMigration() {
  let connection
  try {
    connection = await mysql.createConnection(config)
    console.log('Connected to database')

    // Helper function to check if column exists
    const checkColumn = async (table, column) => {
      try {
        const [rows] = await connection.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = ? AND COLUMN_NAME = ? AND TABLE_SCHEMA = ?`,
          [table, column, process.env.DB_NAME || 'aluminium_erp']
        )
        return rows.length > 0
      } catch {
        return false
      }
    }

    const columnsToAdd = [
      { table: 'work_order', column: 'bom_no', type: 'VARCHAR(50)' },
      { table: 'work_order', column: 'planned_start_date', type: 'DATETIME' },
      { table: 'work_order', column: 'planned_end_date', type: 'DATETIME' },
      { table: 'work_order', column: 'actual_start_date', type: 'DATETIME' },
      { table: 'work_order', column: 'actual_end_date', type: 'DATETIME' },
      { table: 'work_order', column: 'expected_delivery_date', type: 'DATE' }
    ]

    for (const col of columnsToAdd) {
      const exists = await checkColumn(col.table, col.column)
      if (!exists) {
        try {
          await connection.execute(
            `ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`
          )
          console.log(`✓ Added column ${col.column} to ${col.table}`)
        } catch (error) {
          console.log(`⚠️  Failed to add column ${col.column}:`, error.message.substring(0, 80))
        }
      } else {
        console.log(`✓ Column ${col.column} already exists in ${col.table}`)
      }
    }

    console.log('✓ Migration completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigration()
