const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [rows] = await db.execute('DESCRIBE selling_sales_order');
    console.log(JSON.stringify(rows, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
