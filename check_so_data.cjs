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
    const [rows1] = await db.query('SELECT sales_order_id, delivery_date FROM selling_sales_order');
    console.log('selling_sales_order (all):', rows1);
    const [rows2] = await db.query('SELECT sales_order_id, delivery_date FROM sales_order');
    console.log('sales_order (all):', rows2);
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
