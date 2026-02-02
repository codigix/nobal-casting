
import mysql from 'mysql2/promise';
async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    const [cols] = await conn.execute('SHOW COLUMNS FROM material_request_item');
    console.table(cols);
    await conn.end();
  } catch(e) {
    console.error(e);
  }
}
run();
