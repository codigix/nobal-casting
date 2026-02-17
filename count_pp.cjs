const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM production_plan');
    console.log('Production Plan Count:', count);
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
