const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [tables] = await db.query('SHOW TABLES');
    console.log(tables);
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
