import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Checking for hourly_rate column in job_card table...');
    const [jcRows] = await db.query('SHOW COLUMNS FROM job_card LIKE "hourly_rate"');
    if (jcRows.length === 0) {
      console.log('Adding hourly_rate column to job_card table...');
      await db.query('ALTER TABLE job_card ADD COLUMN hourly_rate DECIMAL(18, 2) DEFAULT 0 AFTER operation_time');
      console.log('hourly_rate column added to job_card successfully.');
    } else {
      console.log('hourly_rate column already exists in job_card.');
    }

    console.log('Checking for hourly_rate column in work_order_operation table...');
    const [wooRows] = await db.query('SHOW COLUMNS FROM work_order_operation LIKE "hourly_rate"');
    if (wooRows.length === 0) {
      console.log('Adding hourly_rate column to work_order_operation table...');
      await db.query('ALTER TABLE work_order_operation ADD COLUMN hourly_rate DECIMAL(18, 2) DEFAULT 0 AFTER time');
      console.log('hourly_rate column added to work_order_operation successfully.');
    } else {
      console.log('hourly_rate column already exists in work_order_operation.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.end();
  }
}

migrate();
