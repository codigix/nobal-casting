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
    const [rows] = await c.query('SELECT * FROM job_card_buffer WHERE job_card_id = "JC - 2 - WO-SA-1776157886595-2"'); 
    console.log(JSON.stringify(rows, null, 2)); 
    await c.end(); 
  } catch (e) { 
    console.error(e); 
  } 
} 
run();
