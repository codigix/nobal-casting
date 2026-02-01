
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT) || 3307
};

async function listTables() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables:');
    tables.forEach(row => console.log(`- ${Object.values(row)[0]}`));
  } catch (error) {
    console.error('Failed to list tables:', error);
  } finally {
    await connection.end();
  }
}

listTables();
