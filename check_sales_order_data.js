const mysql = require('mysql2/promise');
async function run() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'nobalcasting_user',
      password: 'C0digix$309',
      database: 'nobalcasting'
    });
    const [rows] = await connection.query('SELECT sales_order_id, created_at, status, order_amount FROM selling_sales_order LIMIT 10');
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
run();
