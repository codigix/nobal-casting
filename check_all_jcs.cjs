const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'nobalcasting_user',
      password: 'C0digix$309',
      database: 'nobalcasting'
    });
    const [rows] = await conn.execute("SELECT job_card_id, operation, operation_sequence, input_qty, produced_quantity, accepted_quantity, rejected_quantity FROM job_card WHERE work_order_id = ?", ["WO-SA-1777014957966-1"]);
    console.log(JSON.stringify(rows, null, 2));
    await conn.end();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
