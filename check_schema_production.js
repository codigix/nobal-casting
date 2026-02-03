const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  try {
    const [woi] = await connection.query('DESCRIBE work_order_item');
    console.log('work_order_item:', woi);
    
    const [bom] = await connection.query('DESCRIBE bom_line');
    console.log('bom_line:', bom);

    const [jc] = await connection.query('DESCRIBE job_card');
    console.log('job_card:', jc);

    const [work_orders] = await connection.query('SELECT wo_id, item_code, quantity, status FROM work_order LIMIT 5');
    console.log('work_orders:', work_orders);

    const [bom_data] = await connection.query('SELECT * FROM bom LIMIT 1');
    console.log('bom:', bom_data);

    const [bom_lines] = await connection.query('SELECT * FROM bom_line LIMIT 5');
    console.log('bom_lines:', bom_lines);

    const [bom_operations] = await connection.query('SELECT * FROM bom_operation LIMIT 5');
    console.log('bom_operations:', bom_operations);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkSchema();
