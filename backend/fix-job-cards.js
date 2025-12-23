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
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  try {
    console.log('🔍 Checking work order...')
    const [workOrder] = await db.query(
      'SELECT wo_id, bom_no, quantity FROM work_order WHERE wo_id = ?',
      ['WO-1765954301913']
    )
    
    if (!workOrder || workOrder.length === 0) {
      console.log('❌ Work order not found')
      process.exit(1)
    }

    console.log('✓ Work Order Found:')
    console.log(JSON.stringify(workOrder[0], null, 2))

    const wo = workOrder[0]
    
    if (!wo.bom_no) {
      console.log('\n⚠️  bom_no is NULL, updating with BOM-1765798532352...')
      await db.query(
        'UPDATE work_order SET bom_no = ? WHERE wo_id = ?',
        ['BOM-1765798532352', 'WO-1765954301913']
      )
      console.log('✓ bom_no updated')
    } else {
      console.log(`✓ bom_no is set to: ${wo.bom_no}`)
    }

    console.log('\n🗑️  Deleting old job cards...')
    const [deleteResult] = await db.query(
      'DELETE FROM job_card WHERE work_order_id = ?',
      ['WO-1765954301913']
    )
    console.log(`✓ Deleted ${deleteResult.affectedRows} old job cards`)

    console.log('\n✓ Fix completed! Job cards will be recreated with proper data.')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
