import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function addMissingColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'nobalcasting',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔧 Adding missing columns to selling_sales_order...')

    const columnsToAdd = [
      { name: 'customer_name', definition: 'VARCHAR(255)' },
      { name: 'customer_email', definition: 'VARCHAR(255)' },
      { name: 'customer_phone', definition: 'VARCHAR(20)' },
      { name: 'items', definition: 'LONGTEXT' },
      { name: 'bom_id', definition: 'VARCHAR(100)' },
      { name: 'bom_name', definition: 'VARCHAR(255)' },
      { name: 'source_warehouse', definition: 'VARCHAR(100)' },
      { name: 'order_type', definition: "VARCHAR(50) DEFAULT 'Sales'" }
    ]

    for (const column of columnsToAdd) {
      try {
        const [result] = await connection.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = 'nobalcasting' AND TABLE_NAME = 'selling_sales_order' AND COLUMN_NAME = ?`,
          [column.name]
        )

        if (result.length === 0) {
          await connection.execute(
            `ALTER TABLE selling_sales_order ADD COLUMN ${column.name} ${column.definition}`
          )
          console.log(`✓ Added column: ${column.name}`)
        } else {
          console.log(`✓ Column ${column.name} already exists`)
        }
      } catch (error) {
        if (error.message.includes('Duplicate')) {
          console.log(`✓ Column ${column.name} already exists`)
        } else {
          throw error
        }
      }
    }

    console.log('✓ All missing columns added successfully!')
  } catch (error) {
    console.error('❌ Error adding columns:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

addMissingColumns()
