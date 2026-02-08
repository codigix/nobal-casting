
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });

    const [cols] = await connection.query('SHOW COLUMNS FROM work_order');
    console.log(JSON.stringify(cols, null, 2));
    await connection.end();
  } catch (err) {
    console.error(err);
  }
}
check();
