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

async function migrate() {
  try {
    console.log('Starting migration...\n')
    
    const [oldPlans] = await db.execute('SELECT plan_id FROM production_plan WHERE plan_id LIKE "PLAN-%"')
    console.log(`Found ${oldPlans.length} plans in old table\n`)
    
    if (oldPlans.length === 0) {
      console.log('No plans to migrate')
      db.end()
      return
    }
    
    for (const plan of oldPlans) {
      try {
        await db.execute(
          `INSERT IGNORE INTO production_planning_header (plan_id, naming_series, company, posting_date, sales_order_id, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [plan.plan_id, 'PP', '', new Date().toISOString().split('T')[0], null, 'draft']
        )
        console.log(`✓ Migrated ${plan.plan_id}`)
      } catch (err) {
        console.log(`✗ Failed to migrate ${plan.plan_id}:`, err.message)
      }
    }
    
    console.log('\nMigration complete!')
    
    const [newPlans] = await db.execute('SELECT COUNT(*) as count FROM production_planning_header')
    console.log(`New table now has ${newPlans[0].count} plans`)
    
    db.end()
  } catch (err) {
    console.error('Migration error:', err.message)
    db.end()
  }
}

migrate()
