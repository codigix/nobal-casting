const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [cols] = await db.query('DESCRIBE selling_sales_order');
    console.log(cols.filter(c => c.Field === 'delivery_date'));
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
