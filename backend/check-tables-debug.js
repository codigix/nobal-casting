import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  const [rows] = await connection.query('SHOW TABLES');
  rows.forEach(r => console.log(Object.values(r)[0]));
  await connection.end();
}

main().catch(console.error);
