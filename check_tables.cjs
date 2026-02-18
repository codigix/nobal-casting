const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3307,
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting'
  });

  try {
    const [rows] = await connection.query('SHOW TABLES');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkTables();
