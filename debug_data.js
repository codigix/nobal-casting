const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [rows] = await db.execute('SELECT job_card_id, work_order_id, status FROM job_card LIMIT 5');
    console.log('Job Cards:', JSON.stringify(rows, null, 2));
    
    const [woRows] = await db.execute('SELECT wo_id, sales_order_id, status FROM work_order LIMIT 5');
    console.log('Work Orders:', JSON.stringify(woRows, null, 2));

    const [soRows] = await db.execute('SELECT sales_order_id, status FROM selling_sales_order LIMIT 5');
    console.log('Sales Orders:', JSON.stringify(soRows, null, 2));

    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
