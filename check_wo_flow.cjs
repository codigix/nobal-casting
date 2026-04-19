const mysql = require('mysql2/promise'); 
async function run() { 
  try { 
    const c = await mysql.createConnection({ 
      host: '127.0.0.1', 
      user: 'nobalcasting_user', 
      password: 'C0digix$309', 
      database: 'nobalcasting', 
      port: 3307 
    }); 
    const [rows] = await c.query('SELECT job_card_id, operation, operation_sequence, planned_quantity, input_qty, status, execution_mode FROM job_card WHERE work_order_id = "WO-SA-1776157886595-1" ORDER BY operation_sequence'); 
    console.log(JSON.stringify(rows, null, 2)); 
    await c.end(); 
  } catch (e) { 
    console.error(e); 
  } 
} 
run();
