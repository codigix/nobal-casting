const mysql = require('mysql2/promise');
async function run() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [rows] = await db.execute('DESCRIBE production_plan_raw_material');
    console.table(rows);
    await db.end();
  } catch (e) {
    console.error(e.message);
  }
}
run();
