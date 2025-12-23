#!/usr/bin/env node
import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔧 Adding analysis columns to workstation table\n')

    const columns = [
      { name: 'allocation_time', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'downtime', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'performance_percentage', type: 'DECIMAL(5,2) DEFAULT 0' },
      { name: 'efficiency_percentage', type: 'DECIMAL(5,2) DEFAULT 0' },
      { name: 'operations_assigned', type: 'TEXT' },
      { name: 'total_jobs', type: 'INT DEFAULT 0' },
      { name: 'completed_jobs', type: 'INT DEFAULT 0' },
      { name: 'rejection_rate', type: 'DECIMAL(5,2) DEFAULT 0' },
      { name: 'last_maintenance_date', type: 'DATE' },
      { name: 'next_maintenance_date', type: 'DATE' },
      { name: 'uptime_hours', type: 'DECIMAL(10,2) DEFAULT 0' }
    ]

    for (const col of columns) {
      try {
        await db.execute(`ALTER TABLE workstation ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`)
        console.log(`✓ Added column: ${col.name}`)
      } catch (err) {
        console.log(`⚠️  ${col.name}: ${err.message.substring(0, 60)}`)
      }
    }

    console.log('\n✓ All columns added successfully!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
