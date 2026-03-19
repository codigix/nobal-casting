import mysql from 'mysql2/promise';

async function checkSchema() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  };

  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.query('DESCRIBE production_entry');
    console.log('Columns in production_entry:');
    rows.forEach(row => console.log(`- ${row.Field} (${row.Type})`));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
