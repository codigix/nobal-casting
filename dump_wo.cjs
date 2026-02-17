const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [rows] = await db.query('SELECT * FROM work_order LIMIT 1');
    if (rows.length > 0) {
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log('No WO found');
    }
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
