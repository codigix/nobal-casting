import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306
})

async function updateProductionPlanSchema() {
  let connection
  try {
    console.log('Connecting to database...')
    connection = await db.getConnection()
    console.log('✓ Database connection successful\n')

    const migrations = [
      {
        name: 'Add bom_id column',
        sql: `ALTER TABLE production_plan ADD COLUMN bom_id VARCHAR(100)`
      },
      {
        name: 'Add week_number column',
        sql: `ALTER TABLE production_plan ADD COLUMN week_number INT`
      },
      {
        name: 'Add planned_by_id column',
        sql: `ALTER TABLE production_plan ADD COLUMN planned_by_id INT`
      },
      {
        name: 'Rename posting_date to plan_date',
        sql: `ALTER TABLE production_plan CHANGE COLUMN posting_date plan_date DATE`
      }
    ]

    for (const migration of migrations) {
      try {
        await connection.query(migration.sql)
        console.log(`✓ ${migration.name}`)
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`✓ ${migration.name} (already exists)`)
        } else {
          console.warn(`⚠ ${migration.name}: ${error.message}`)
        }
      }
    }

    console.log('\n✓ Production plan schema update completed!')
    connection.release()
  } catch (error) {
    console.error('\n✗ Error:', error.message)
    if (connection) connection.release()
    process.exit(1)
  } finally {
    await db.end()
  }
}

updateProductionPlanSchema()
