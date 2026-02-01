const mysql = require('mysql2/promise');
async function run() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [rows] = await db.execute('SELECT * FROM production_plan_raw_material WHERE plan_id = "PP-1769759860917"');
    console.table(rows);
    await db.end();
  } catch (e) {
    console.error(e.message);
  }
}
run();
