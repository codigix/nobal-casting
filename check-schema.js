const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'nobalcasting'
    });
    
    const [result] = await conn.execute('DESCRIBE selling_sales_order');
    result.forEach(r => {
      if (r.Field === 'status') {
        console.log('Status column:', r.Field, r.Type, r.Null, r.Key, r.Default, r.Extra);
      }
    });
    
    await conn.end();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
