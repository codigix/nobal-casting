import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function listTables() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'nobalcasting',
    port: 3306
  });

  try {
    const [rows] = await connection.query('SHOW TABLES');
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

listTables();
