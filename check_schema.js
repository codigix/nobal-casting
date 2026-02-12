const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'nobalcasting_user',
      password: 'C0digix$309',
      database: 'nobalcasting',
      port: 3307
    });
    const [cols] = await db.execute('DESCRIBE time_log');
    console.log(JSON.stringify(cols, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
