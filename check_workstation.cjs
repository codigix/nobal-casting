
const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307,
  });

  try {
    const [rows] = await connection.execute("SELECT * FROM workstation WHERE name = 'CNC Turning Center'");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
