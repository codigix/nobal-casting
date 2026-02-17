const mysql = require('mysql2/promise');
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'nobalcasting_user',
      password: 'C0digix$309',
      database: 'nobalcasting',
      port: 3307
    });
    const [rows] = await connection.execute('DESCRIBE selling_invoice');
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (error) {
    console.error(error);
  }
})();
