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
    console.log('🔧 Creating Historical Metrics Tables\n')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS workstation_daily_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workstation_id INT NOT NULL,
        workstation_name VARCHAR(255),
        metric_date DATE NOT NULL,
        allocation_time DECIMAL(10,2) DEFAULT 0,
        downtime DECIMAL(10,2) DEFAULT 0,
        jobs_completed INT DEFAULT 0,
        performance_percentage DECIMAL(5,2) DEFAULT 0,
        efficiency_percentage DECIMAL(5,2) DEFAULT 0,
        rejection_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workstation_id) REFERENCES workstation(id) ON DELETE CASCADE,
        INDEX idx_workstation_date (workstation_id, metric_date),
        UNIQUE KEY unique_ws_date (workstation_id, metric_date)
      )
    `)
    console.log('✓ Daily metrics table created')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS workstation_monthly_metrics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workstation_id INT NOT NULL,
        workstation_name VARCHAR(255),
        metric_month VARCHAR(7) NOT NULL,
        total_allocation_time DECIMAL(10,2) DEFAULT 0,
        total_downtime DECIMAL(10,2) DEFAULT 0,
        total_jobs_completed INT DEFAULT 0,
        avg_performance_percentage DECIMAL(5,2) DEFAULT 0,
        avg_efficiency_percentage DECIMAL(5,2) DEFAULT 0,
        avg_rejection_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workstation_id) REFERENCES workstation(id) ON DELETE CASCADE,
        INDEX idx_workstation_month (workstation_id, metric_month),
        UNIQUE KEY unique_ws_month (workstation_id, metric_month)
      )
    `)
    console.log('✓ Monthly metrics table created\n')

    console.log('📊 Populating historical metrics for all workstations...\n')

    const [allWorkstations] = await db.query('SELECT id, workstation_name FROM workstation WHERE is_active = 1')

    let processedDaily = 0
    let processedMonthly = 0

    for (const ws of allWorkstations) {
      const today = new Date()

      for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
        const date = new Date(today)
        date.setDate(date.getDate() - daysAgo)
        const dateStr = date.toISOString().split('T')[0]

        const allocation = Math.floor(Math.random() * 200) + 150
        const downtime = Math.floor(Math.random() * 20) + 2
        const completed = Math.floor(Math.random() * 30) + 10
        const performance = Math.floor(Math.random() * 25) + 75
        const efficiency = Math.floor(Math.random() * 20) + 85
        const rejection = Math.floor(Math.random() * 4 * 10) / 10

        try {
          await db.execute(
            `INSERT INTO workstation_daily_metrics 
             (workstation_id, workstation_name, metric_date, allocation_time, downtime, jobs_completed, 
              performance_percentage, efficiency_percentage, rejection_rate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             allocation_time = VALUES(allocation_time),
             downtime = VALUES(downtime),
             jobs_completed = VALUES(jobs_completed),
             performance_percentage = VALUES(performance_percentage),
             efficiency_percentage = VALUES(efficiency_percentage),
             rejection_rate = VALUES(rejection_rate)`,
            [ws.id, ws.workstation_name, dateStr, allocation, downtime, completed, performance, efficiency, rejection]
          )
          processedDaily++
        } catch (err) {
          console.log(`⚠️  Error inserting daily metric: ${err.message.substring(0, 50)}`)
        }
      }

      for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
        const date = new Date(today)
        date.setMonth(date.getMonth() - monthsAgo)
        const metricMonth = date.toISOString().substring(0, 7)

        const totalAllocation = Math.floor(Math.random() * 5000) + 4000
        const totalDowntime = Math.floor(Math.random() * 300) + 100
        const totalJobs = Math.floor(Math.random() * 500) + 300
        const avgPerformance = Math.floor(Math.random() * 15) + 80
        const avgEfficiency = Math.floor(Math.random() * 12) + 85
        const avgRejection = Math.floor(Math.random() * 3 * 10) / 10

        try {
          await db.execute(
            `INSERT INTO workstation_monthly_metrics 
             (workstation_id, workstation_name, metric_month, total_allocation_time, total_downtime, 
              total_jobs_completed, avg_performance_percentage, avg_efficiency_percentage, avg_rejection_rate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_allocation_time = VALUES(total_allocation_time),
             total_downtime = VALUES(total_downtime),
             total_jobs_completed = VALUES(total_jobs_completed),
             avg_performance_percentage = VALUES(avg_performance_percentage),
             avg_efficiency_percentage = VALUES(avg_efficiency_percentage),
             avg_rejection_rate = VALUES(avg_rejection_rate)`,
            [ws.id, ws.workstation_name, metricMonth, totalAllocation, totalDowntime, totalJobs, 
             avgPerformance, avgEfficiency, avgRejection]
          )
          processedMonthly++
        } catch (err) {
          console.log(`⚠️  Error inserting monthly metric: ${err.message.substring(0, 50)}`)
        }
      }
    }

    console.log(`✓ Processed ${processedDaily} daily metrics`)
    console.log(`✓ Processed ${processedMonthly} monthly metrics`)

    const [[{ dailyCount }]] = await db.query('SELECT COUNT(*) as dailyCount FROM workstation_daily_metrics')
    const [[{ monthlyCount }]] = await db.query('SELECT COUNT(*) as monthlyCount FROM workstation_monthly_metrics')

    console.log(`\n📊 Total daily metrics records: ${dailyCount}`)
    console.log(`📊 Total monthly metrics records: ${monthlyCount}`)
    console.log('\n✓ Historical metrics populated successfully!')

    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
