
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function checkData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3307
  });

  try {
    console.log('--- Selling Sales Orders ---');
    const [orders] = await connection.query('SELECT sales_order_id, status, order_amount FROM selling_sales_order LIMIT 5');
    console.table(orders);

    console.log('--- Work Orders ---');
    const [workOrders] = await connection.query('SELECT wo_id, sales_order_id, status, quantity FROM work_order LIMIT 5');
    console.table(workOrders);

    console.log('--- Job Cards ---');
    const [jobCards] = await connection.query('SELECT job_card_id, work_order_id, operation, status, produced_quantity FROM job_card LIMIT 5');
    console.table(jobCards);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkData();
