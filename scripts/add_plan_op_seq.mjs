
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Adding plan_operation_sequence column to job_card table...');
    const [cols] = await connection.query('SHOW COLUMNS FROM job_card LIKE "plan_operation_sequence"');
    if (cols.length === 0) {
      await connection.query('ALTER TABLE job_card ADD COLUMN plan_operation_sequence INT DEFAULT 0');
      console.log('Column plan_operation_sequence added successfully');
    } else {
      console.log('Column plan_operation_sequence already exists');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
