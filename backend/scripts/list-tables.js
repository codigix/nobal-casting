import mysql from 'mysql2/promise';

async function listTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables in nobalcasting:', rows);
  } catch (error) {
    console.error('Error listing tables:', error);
  } finally {
    await connection.end();
  }
}

listTables();
