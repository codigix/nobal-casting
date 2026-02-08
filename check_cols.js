const mysql = require('mysql2/promise');
async function run() {
  try {
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'nobalcasting_user',
      password: 'C0digix$309',
      database: 'nobalcasting',
      port: 3307
    });
    const [cols] = await db.query('DESCRIBE rejection_entry');
    console.table(cols);
    const [cols2] = await db.query('DESCRIBE time_log');
    console.table(cols2);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
