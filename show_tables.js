const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'nobalcasting_user',
      password: 'C0digix$309',
      database: 'nobalcasting'
    });
    const [rows] = await db.execute('SHOW TABLES');
    console.log(JSON.stringify(rows, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
