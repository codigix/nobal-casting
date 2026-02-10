import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    console.log('Adding parent_item_code to production_plan_sub_assembly...');
    await connection.execute("ALTER TABLE production_plan_sub_assembly ADD COLUMN parent_item_code VARCHAR(100) DEFAULT NULL AFTER item_code");
    console.log('Migration successful!');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column parent_item_code already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    await connection.end();
  }
}

migrate();
