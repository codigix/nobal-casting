
import mysql from 'mysql2/promise';

async function listWarehouses() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [rows] = await connection.execute('SELECT * FROM warehouse');
    console.table(rows.map(r => ({ Code: r.warehouse_code, Name: r.name })));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

listWarehouses();
