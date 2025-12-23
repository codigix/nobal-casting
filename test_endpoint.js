import { createPool } from 'mysql2/promise'

const db = createPool({
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'nobalcasting',
  port: 3306
})

async function test() {
  try {
    console.log('Testing sales orders endpoint...\n')
    
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM selling_sales_order`
    )
    console.log('✓ Total:', total)
    
    const [statusCounts] = await db.query(
      `SELECT status, COUNT(*) as count FROM selling_sales_order GROUP BY status`
    )
    console.log('✓ Status counts:', statusCounts)
    
    const [allProjects] = await db.query(
      `SELECT sales_order_id as id, 
              CONCAT(sales_order_id, ' - SO') as name, 
              status, 
              order_amount as quantity,
              COALESCE(DATEDIFF(delivery_date, NOW()), 0) as daysLeft,
              customer_id as customer,
              created_at as order_date,
              0 as progress
       FROM selling_sales_order
       ORDER BY created_at DESC
       LIMIT 3`
    )
    console.log('✓ Projects found:', allProjects.length)
    console.log('  Sample:', allProjects[0])
    
    const [monthlyTimeline] = await db.query(
      `SELECT DATE_FORMAT(MIN(created_at), '%b') as month, 
              COUNT(*) as total_projects,
              SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed
       FROM selling_sales_order
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY DATE_FORMAT(MIN(created_at), '%Y-%m') DESC
       LIMIT 6`
    )
    console.log('✓ Timeline:', monthlyTimeline)
    
    console.log('\n✅ All database queries work!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

test()
