import mysql from 'mysql2/promise'

async function fixSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'nobalcasting'
  })

  try {
    // Check if total_quantity exists in production_plan
    const [cols] = await connection.execute('DESC production_plan')
    const hasQuantity = cols.some(col => col.Field === 'total_quantity')

    if (!hasQuantity) {
      console.log('Adding total_quantity column to production_plan...')
      await connection.execute(`
        ALTER TABLE production_plan 
        ADD COLUMN total_quantity INT DEFAULT 0 AFTER sales_order_id
      `)
      console.log('✓ total_quantity column added')
    } else {
      console.log('✓ total_quantity column already exists')
    }

    // Update production plans with total_quantity from their work orders
    console.log('\nUpdating production plans with work order quantities...')
    const [plans] = await connection.execute('SELECT plan_id FROM production_plan')
    
    for (const plan of plans) {
      const [wos] = await connection.execute(
        'SELECT COALESCE(SUM(quantity), 0) as total FROM work_order WHERE sales_order_id = (SELECT sales_order_id FROM production_plan WHERE plan_id = ?)',
        [plan.plan_id]
      )
      const total = wos[0].total
      await connection.execute(
        'UPDATE production_plan SET total_quantity = ? WHERE plan_id = ?',
        [total, plan.plan_id]
      )
      console.log(`  ${plan.plan_id}: ${total} qty`)
    }

    console.log('\n=== UPDATED PRODUCTION PLANS ===')
    const [updated] = await connection.execute('SELECT plan_id, status, total_quantity, sales_order_id FROM production_plan')
    updated.forEach(row => {
      console.log(`  ${row.plan_id}: status=${row.status}, qty=${row.total_quantity}, so=${row.sales_order_id}`)
    })

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await connection.end()
  }
}

fixSchema()
