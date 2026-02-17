const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [cols] = await db.query('SHOW COLUMNS FROM selling_sales_order');
    console.log(cols.map(c => c.Field).join(', '));
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
