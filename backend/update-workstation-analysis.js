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
    console.log('🔧 Updating Workstation Table with Analysis Data\n')

    const alterStatements = [
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS allocation_time DECIMAL(10,2) DEFAULT 0 COMMENT 'Allocation time in hours'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS downtime DECIMAL(10,2) DEFAULT 0 COMMENT 'Downtime in hours'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS performance_percentage DECIMAL(5,2) DEFAULT 0 COMMENT 'Performance percentage'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS efficiency_percentage DECIMAL(5,2) DEFAULT 0 COMMENT 'Efficiency percentage'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS operations_assigned TEXT COMMENT 'Assigned operations'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS total_jobs INT DEFAULT 0 COMMENT 'Total jobs assigned'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS completed_jobs INT DEFAULT 0 COMMENT 'Completed jobs'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS rejection_rate DECIMAL(5,2) DEFAULT 0 COMMENT 'Rejection rate percentage'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS last_maintenance_date DATE COMMENT 'Last maintenance date'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS next_maintenance_date DATE COMMENT 'Next scheduled maintenance'`,
      `ALTER TABLE workstation ADD COLUMN IF NOT EXISTS uptime_hours DECIMAL(10,2) DEFAULT 0 COMMENT 'Total uptime hours'`
    ]

    console.log('📝 Adding columns to workstation table...\n')
    
    for (const statement of alterStatements) {
      try {
        await db.execute(statement)
        console.log(`✓ ${statement.substring(20, 70)}...`)
      } catch (err) {
        if (!err.message.includes('Duplicate')) {
          console.log(`⚠️  ${err.message.substring(0, 80)}`)
        }
      }
    }

    console.log('\n📊 Populating workstations with analysis data...\n')

    const workstationMetrics = [
      { name: 'WS001', allocation: 320, downtime: 8, performance: 92, efficiency: 94, operations: 'Melting, Casting', jobs: 45, completed: 43, rejection: 1.5 },
      { name: 'WS002', allocation: 240, downtime: 12, performance: 88, efficiency: 90, operations: 'CNC Lathe Operations', jobs: 35, completed: 32, rejection: 2.0 },
      { name: 'WS003', allocation: 280, downtime: 4, performance: 95, efficiency: 96, operations: 'Assembly', jobs: 52, completed: 50, rejection: 0.8 },
      { name: 'WS004', allocation: 200, downtime: 2, performance: 98, efficiency: 98, operations: 'Quality Inspection', jobs: 78, completed: 77, rejection: 1.0 },
      { name: 'WS005', allocation: 320, downtime: 6, performance: 93, efficiency: 95, operations: 'Packaging, Dispatch', jobs: 65, completed: 63, rejection: 0.5 },
      { name: 'WS006', allocation: 260, downtime: 10, performance: 89, efficiency: 91, operations: 'CNC Milling', jobs: 38, completed: 36, rejection: 2.5 },
    ]

    for (const metric of workstationMetrics) {
      try {
        await db.execute(
          `UPDATE workstation SET 
           allocation_time = ?,
           downtime = ?,
           performance_percentage = ?,
           efficiency_percentage = ?,
           operations_assigned = ?,
           total_jobs = ?,
           completed_jobs = ?,
           rejection_rate = ?,
           last_maintenance_date = DATE_SUB(CURDATE(), INTERVAL ? DAY),
           next_maintenance_date = DATE_ADD(CURDATE(), INTERVAL ? DAY),
           uptime_hours = ?
           WHERE name = ?`,
          [
            metric.allocation,
            metric.downtime,
            metric.performance,
            metric.efficiency,
            metric.operations,
            metric.jobs,
            metric.completed,
            metric.rejection,
            Math.floor(Math.random() * 30) + 5,
            Math.floor(Math.random() * 30) + 20,
            metric.allocation - metric.downtime,
            metric.name
          ]
        )
        console.log(`✓ ${metric.name} - Updated with metrics`)
      } catch (err) {
        console.error(`✗ Error updating ${metric.name}:`, err.message)
      }
    }

    console.log('\n📈 Populating remaining workstations with random metrics...\n')

    const [allWorkstations] = await db.query('SELECT name FROM workstation WHERE name NOT IN (?, ?, ?, ?, ?, ?)', 
      ['WS001', 'WS002', 'WS003', 'WS004', 'WS005', 'WS006']
    )

    const operationTypes = [
      'Casting, Molding',
      'Machining, Drilling',
      'Assembly, Welding',
      'Testing, Inspection',
      'Packaging, Labeling',
      'Finishing, Polishing',
      'Surface Treatment',
      'Quality Control',
      'Heat Treatment',
      'Material Preparation'
    ]

    for (const ws of allWorkstations) {
      const allocation = Math.floor(Math.random() * 200) + 150
      const downtime = Math.floor(Math.random() * 20) + 2
      const performance = Math.floor(Math.random() * 25) + 75
      const efficiency = Math.floor(Math.random() * 20) + 85
      const jobs = Math.floor(Math.random() * 50) + 20
      const completed = Math.floor(jobs * (0.85 + Math.random() * 0.15))
      const rejection = Math.floor(Math.random() * 4 * 10) / 10
      const operationIndex = Math.floor(Math.random() * operationTypes.length)

      try {
        await db.execute(
          `UPDATE workstation SET 
           allocation_time = ?,
           downtime = ?,
           performance_percentage = ?,
           efficiency_percentage = ?,
           operations_assigned = ?,
           total_jobs = ?,
           completed_jobs = ?,
           rejection_rate = ?,
           last_maintenance_date = DATE_SUB(CURDATE(), INTERVAL ? DAY),
           next_maintenance_date = DATE_ADD(CURDATE(), INTERVAL ? DAY),
           uptime_hours = ?
           WHERE name = ?`,
          [
            allocation,
            downtime,
            performance,
            efficiency,
            operationTypes[operationIndex],
            jobs,
            completed,
            rejection,
            Math.floor(Math.random() * 60) + 5,
            Math.floor(Math.random() * 60) + 10,
            allocation - downtime,
            ws.name
          ]
        )
      } catch (err) {
        console.log(`⚠️  Error updating ${ws.name}`)
      }
    }

    console.log(`✓ Updated ${allWorkstations.length} additional workstations with random metrics\n`)

    const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM workstation WHERE is_active = 1')
    console.log(`📊 Total active workstations updated: ${count}`)
    console.log('\n✓ Workstation analysis data populated successfully!')

    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
