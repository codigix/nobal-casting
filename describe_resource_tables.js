const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: '127.0.0.1', port: 3307, user: 'nobalcasting_user', password: 'C0digix$309', database: 'nobalcasting'
    });
    const [machines] = await db.execute('DESCRIBE machine_master');
    const [downtime] = await db.execute('DESCRIBE downtime_entry');
    const [jobCard] = await db.execute('DESCRIBE job_card');
    const [timeLog] = await db.execute('DESCRIBE time_log');
    console.log(JSON.stringify({machines, downtime, jobCard, timeLog}, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
