import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function query() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const [cols] = await connection.execute("DESCRIBE production_plan_sub_assembly");
    console.table(cols);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

query();
