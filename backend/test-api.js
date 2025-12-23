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
    console.log('🧪 Testing Machine Analysis API Data\n')

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM workstation WHERE is_active = 1`
    )
    console.log(`✓ Total Active Workstations: ${total}`)

    const [analysisData] = await db.query(
      `SELECT 
        wa.id,
        wa.workstation_id,
        wa.workstation_name,
        wa.allocation_time,
        wa.downtime,
        wa.performance_percentage,
        wa.efficiency_percentage,
        wa.operations_assigned,
        wa.total_jobs,
        wa.completed_jobs,
        wa.rejection_rate,
        w.status
       FROM workstation_analysis wa
       LEFT JOIN workstation w ON wa.workstation_id = w.id
       WHERE w.is_active = 1
       ORDER BY wa.workstation_name
       LIMIT 5`
    )

    console.log('\n📊 Sample Machine Analysis Data:\n')
    analysisData.forEach(data => {
      console.log(`Machine: ${data.workstation_name}`)
      console.log(`  Operations: ${data.operations_assigned}`)
      console.log(`  Allocation Time: ${data.allocation_time}h`)
      console.log(`  Downtime: ${data.downtime}h`)
      console.log(`  Performance: ${data.performance_percentage}%`)
      console.log(`  Efficiency: ${data.efficiency_percentage}%`)
      console.log(`  Jobs: ${data.completed_jobs}/${data.total_jobs}`)
      console.log(`  Rejection Rate: ${data.rejection_rate}%`)
      console.log(`  Status: ${data.status}\n`)
    })

    console.log('✓ API test completed successfully!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
