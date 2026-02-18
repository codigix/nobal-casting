import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'd:/projects/nobal-casting/backend/.env' });

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const tables = ['production_plan', 'production_plan_fg', 'production_plan_sub_assembly', 'production_plan_raw_material', 'production_plan_operations'];
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`--- ${table} schema ---`);
        console.table(rows);
      } catch (e) {
        console.log(`Table ${table} not found or error:`, e.message);
      }
    }

    const [statusRows] = await connection.execute('SELECT DISTINCT status FROM production_plan');
    console.log('--- existing statuses ---');
    console.table(statusRows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkSchema();
