import mysql from 'mysql2/promise'

async function checkData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'nobalcasting'
  })

  try {
    const [salesOrders] = await connection.execute('SELECT COUNT(*) as count FROM sales_order')
    const [prodPlans] = await connection.execute('SELECT COUNT(*) as count FROM production_plan')
    const [workOrders] = await connection.execute('SELECT COUNT(*) as count FROM work_order')
    const [jobCards] = await connection.execute('SELECT COUNT(*) as count FROM job_card')
    
    console.log('=== DATABASE COUNTS ===')
    console.log('Sales Orders:', salesOrders[0].count)
    console.log('Production Plans:', prodPlans[0].count)
    console.log('Work Orders:', workOrders[0].count)
    console.log('Job Cards:', jobCards[0].count)

    // Get sample data with DESC output
    const [so] = await connection.execute('DESC sales_order')
    console.log('\n=== SALES_ORDER COLUMNS ===')
    so.forEach(row => console.log(`  ${row.Field}: ${row.Type}`))

    const [soRows] = await connection.execute('SELECT * FROM sales_order LIMIT 2')
    console.log('\n=== SAMPLE SALES ORDERS ===')
    soRows.forEach(row => console.log(`  ${JSON.stringify(row)}`))

    const [ppCols] = await connection.execute('DESC production_plan')
    console.log('\n=== PRODUCTION_PLAN COLUMNS ===')
    ppCols.forEach(row => console.log(`  ${row.Field}: ${row.Type}`))

    const [ppRows] = await connection.execute('SELECT * FROM production_plan LIMIT 2')
    console.log('\n=== SAMPLE PRODUCTION PLANS ===')
    ppRows.forEach(row => console.log(`  ${JSON.stringify(row)}`))

    const [woCols] = await connection.execute('DESC work_order')
    console.log('\n=== WORK_ORDER COLUMNS ===')
    woCols.forEach(row => console.log(`  ${row.Field}: ${row.Type}`))

    const [woRows] = await connection.execute('SELECT * FROM work_order LIMIT 2')
    console.log('\n=== SAMPLE WORK ORDERS ===')
    woRows.forEach(row => console.log(`  ${JSON.stringify(row)}`))

    const [jcCols] = await connection.execute('DESC job_card')
    console.log('\n=== JOB_CARD COLUMNS ===')
    jcCols.forEach(row => console.log(`  ${row.Field}: ${row.Type}`))

    const [jcStatus] = await connection.execute('SELECT status, COUNT(*) as count FROM job_card GROUP BY status')
    console.log('\n=== JOB CARD STATUS BREAKDOWN ===')
    jcStatus.forEach(row => console.log(`  ${row.status}: ${row.count}`))

    const [woStatus] = await connection.execute('SELECT status, COUNT(*) as count FROM work_order GROUP BY status')
    console.log('\n=== WORK ORDER STATUS BREAKDOWN ===')
    woStatus.forEach(row => console.log(`  ${row.status}: ${row.count}`))

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await connection.end()
  }
}

checkData()
