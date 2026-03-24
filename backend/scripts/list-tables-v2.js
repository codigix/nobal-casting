
import mysql from 'mysql2/promise';

async function listTables() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [rows] = await connection.execute('SHOW TABLES');
    console.table(rows.map(r => Object.values(r)[0]));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

listTables();
