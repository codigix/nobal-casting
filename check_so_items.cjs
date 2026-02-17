const mysql = require('mysql2/promise');
(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [rows] = await db.query('SELECT sales_order_id, items FROM selling_sales_order WHERE items IS NOT NULL LIMIT 1');
    if (rows.length > 0) {
      console.log('SO:', rows[0].sales_order_id);
      console.log('Items:', rows[0].items);
    } else {
      console.log('No SO with items found');
    }
    await db.end();
  } catch (err) {
    console.error(err);
  }
})();
