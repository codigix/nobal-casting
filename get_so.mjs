import mysql from 'mysql2/promise';
const db = await mysql.createConnection({
  host: '127.0.0.1',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307
});
const [rows] = await db.execute('SELECT sales_order_id FROM selling_sales_order LIMIT 5');
console.log(JSON.stringify(rows));
process.exit(0);
