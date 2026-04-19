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
    const [rows] = await c.query('SELECT * FROM production_plan_sub_assembly WHERE plan_id = "PP-1775998298009"'); 
    console.log(JSON.stringify(rows, null, 2)); 
    await c.end(); 
  } catch (e) { 
    console.error(e); 
  } 
} 
run();
