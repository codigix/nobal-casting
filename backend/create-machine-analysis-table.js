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
    console.log('🔧 Creating Machine Analysis Table\n')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS workstation_analysis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workstation_id INT NOT NULL,
        workstation_name VARCHAR(255),
        allocation_time DECIMAL(10,2) DEFAULT 0,
        downtime DECIMAL(10,2) DEFAULT 0,
        performance_percentage DECIMAL(5,2) DEFAULT 0,
        efficiency_percentage DECIMAL(5,2) DEFAULT 0,
        operations_assigned VARCHAR(255),
        total_jobs INT DEFAULT 0,
        completed_jobs INT DEFAULT 0,
        rejection_rate DECIMAL(5,2) DEFAULT 0,
        last_maintenance_date DATE,
        next_maintenance_date DATE,
        uptime_hours DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workstation_id) REFERENCES workstation(id) ON DELETE CASCADE,
        INDEX idx_workstation_id (workstation_id)
      )
    `)
    console.log('✓ Workstation analysis table created\n')

    console.log('📊 Populating analysis data...\n')

    const [allWorkstations] = await db.query('SELECT id, workstation_name FROM workstation WHERE is_active = 1 ORDER BY workstation_name')

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
      'Material Preparation',
      'CNC Operations',
      'Turning, Boring',
      'Grinding, Finishing',
      'Press Work',
      'Forging'
    ]

    const baseMetrics = [
      { id: 1, name: 'WS001', allocation: 320, downtime: 8, performance: 92, efficiency: 94, operations: 'Melting, Casting', jobs: 45, completed: 43, rejection: 1.5 },
      { id: 2, name: 'WS002', allocation: 240, downtime: 12, performance: 88, efficiency: 90, operations: 'CNC Lathe Operations', jobs: 35, completed: 32, rejection: 2.0 },
      { id: 3, name: 'WS003', allocation: 280, downtime: 4, performance: 95, efficiency: 96, operations: 'Assembly', jobs: 52, completed: 50, rejection: 0.8 },
      { id: 4, name: 'WS004', allocation: 200, downtime: 2, performance: 98, efficiency: 98, operations: 'Quality Inspection', jobs: 78, completed: 77, rejection: 1.0 },
      { id: 5, name: 'WS005', allocation: 320, downtime: 6, performance: 93, efficiency: 95, operations: 'Packaging, Dispatch', jobs: 65, completed: 63, rejection: 0.5 },
      { id: 6, name: 'WS006', allocation: 260, downtime: 10, performance: 89, efficiency: 91, operations: 'CNC Milling', jobs: 38, completed: 36, rejection: 2.5 },
    ]

    let processed = 0
    for (const ws of allWorkstations) {
      try {
        let metric = baseMetrics.find(m => m.name === ws.workstation_name)
        
        if (!metric) {
          const allocation = Math.floor(Math.random() * 200) + 150
          const downtime = Math.floor(Math.random() * 20) + 2
          const performance = Math.floor(Math.random() * 25) + 75
          const efficiency = Math.floor(Math.random() * 20) + 85
          const jobs = Math.floor(Math.random() * 50) + 20
          const completed = Math.floor(jobs * (0.85 + Math.random() * 0.15))
          const rejection = Math.floor(Math.random() * 4 * 10) / 10
          const operationIndex = Math.floor(Math.random() * operationTypes.length)

          metric = {
            id: ws.id,
            name: ws.workstation_name,
            allocation,
            downtime,
            performance,
            efficiency,
            operations: operationTypes[operationIndex],
            jobs,
            completed,
            rejection
          }
        }

        const maintenanceDaysBefore = Math.floor(Math.random() * 60) + 5
        const maintenanceDaysAfter = Math.floor(Math.random() * 60) + 10

        await db.execute(
          `INSERT INTO workstation_analysis 
           (workstation_id, workstation_name, allocation_time, downtime, performance_percentage, 
            efficiency_percentage, operations_assigned, total_jobs, completed_jobs, rejection_rate,
            last_maintenance_date, next_maintenance_date, uptime_hours)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
           DATE_SUB(CURDATE(), INTERVAL ? DAY), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)`,
          [
            metric.id,
            ws.workstation_name,
            metric.allocation,
            metric.downtime,
            metric.performance,
            metric.efficiency,
            metric.operations,
            metric.jobs,
            metric.completed,
            metric.rejection,
            maintenanceDaysBefore,
            maintenanceDaysAfter,
            metric.allocation - metric.downtime
          ]
        )
        processed++
      } catch (err) {
        console.log(`⚠️  Error processing ${ws.workstation_name}: ${err.message.substring(0, 50)}`)
      }
    }

    console.log(`✓ Processed ${processed} workstations`)

    const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM workstation_analysis')
    console.log(`📊 Total analysis records: ${count}`)
    console.log('\n✓ Machine analysis data populated successfully!')

    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
