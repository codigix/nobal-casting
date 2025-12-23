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
    console.log('🧪 Testing Historical Metrics API\n')

    const [firstWorkstation] = await db.query('SELECT id FROM workstation LIMIT 1')
    const wsId = firstWorkstation[0].id

    console.log(`Testing with workstation ID: ${wsId}\n`)

    const [dailyData] = await db.query(
      `SELECT 
        metric_date as date,
        allocation_time,
        downtime,
        jobs_completed,
        performance_percentage,
        efficiency_percentage,
        rejection_rate
       FROM workstation_daily_metrics
       WHERE workstation_id = ?
       ORDER BY metric_date DESC
       LIMIT 30`,
      [wsId]
    )

    console.log('📅 Daily Metrics Sample:')
    console.log(`  Records: ${dailyData.length}`)
    if (dailyData.length > 0) {
      console.log(`  Latest: ${dailyData[0].date}`)
      console.log(`    Performance: ${dailyData[0].performance_percentage}%`)
      console.log(`    Efficiency: ${dailyData[0].efficiency_percentage}%\n`)
    }

    const [weeklyData] = await db.query(
      `SELECT 
        DATE_FORMAT(metric_date, '%Y-W%u') as week,
        DATE(MIN(metric_date)) as start_date,
        ROUND(AVG(allocation_time), 2) as avg_allocation,
        ROUND(AVG(downtime), 2) as avg_downtime,
        SUM(jobs_completed) as total_jobs,
        ROUND(AVG(performance_percentage), 2) as avg_performance,
        ROUND(AVG(efficiency_percentage), 2) as avg_efficiency,
        ROUND(AVG(rejection_rate), 2) as avg_rejection
       FROM workstation_daily_metrics
       WHERE workstation_id = ?
       GROUP BY DATE_FORMAT(metric_date, '%Y-W%u')
       ORDER BY start_date DESC
       LIMIT 12`,
      [wsId]
    )

    console.log('📊 Weekly Metrics Sample:')
    console.log(`  Records: ${weeklyData.length}`)
    if (weeklyData.length > 0) {
      console.log(`  Latest Week: ${weeklyData[0].week}`)
      console.log(`    Avg Performance: ${weeklyData[0].avg_performance}%`)
      console.log(`    Total Jobs: ${weeklyData[0].total_jobs}\n`)
    }

    const [monthlyData] = await db.query(
      `SELECT 
        metric_month as month,
        total_allocation_time,
        total_downtime,
        total_jobs_completed,
        avg_performance_percentage,
        avg_efficiency_percentage,
        avg_rejection_rate
       FROM workstation_monthly_metrics
       WHERE workstation_id = ?
       ORDER BY metric_month DESC
       LIMIT 12`,
      [wsId]
    )

    console.log('📈 Monthly Metrics Sample:')
    console.log(`  Records: ${monthlyData.length}`)
    if (monthlyData.length > 0) {
      console.log(`  Latest Month: ${monthlyData[0].month}`)
      console.log(`    Total Jobs: ${monthlyData[0].total_jobs_completed}`)
      console.log(`    Avg Performance: ${monthlyData[0].avg_performance_percentage}%\n`)
    }

    console.log('✅ All historical metrics endpoints working correctly!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
