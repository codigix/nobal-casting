import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'proot',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  });

  try {
    const [rows] = await connection.query('DESCRIBE stock_ledger');
    console.log('stock_ledger schema:');
    console.table(rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
