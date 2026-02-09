const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [rows] = await db.execute(`
      SELECT jc.job_card_id, wo.wo_id, wo.sales_order_id, jc.status as jc_status, wo.status as wo_status, sso.status as so_status 
      FROM job_card jc 
      JOIN work_order wo ON jc.work_order_id = wo.wo_id 
      JOIN selling_sales_order sso ON wo.sales_order_id = sso.sales_order_id 
      LIMIT 5
    `);
    console.log(JSON.stringify(rows, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
