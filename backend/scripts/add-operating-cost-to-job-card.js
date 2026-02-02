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
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Checking for operating_cost column in job_card table...');
    const [jcRows] = await db.query('SHOW COLUMNS FROM job_card LIKE "operating_cost"');
    if (jcRows.length === 0) {
      console.log('Adding operating_cost column to job_card table...');
      await db.query('ALTER TABLE job_card ADD COLUMN operating_cost DECIMAL(18, 2) DEFAULT 0 AFTER hourly_rate');
      console.log('operating_cost column added to job_card successfully.');
    } else {
      console.log('operating_cost column already exists in job_card.');
    }

    // Also ensure operation_type exists in job_card as it's used in ProductionModel.js
    console.log('Checking for operation_type column in job_card table...');
    const [opTypeRows] = await db.query('SHOW COLUMNS FROM job_card LIKE "operation_type"');
    if (opTypeRows.length === 0) {
      console.log('Adding operation_type column to job_card table...');
      await db.query('ALTER TABLE job_card ADD COLUMN operation_type VARCHAR(50) DEFAULT "IN_HOUSE" AFTER operation_sequence');
      console.log('operation_type column added to job_card successfully.');
    } else {
      console.log('operation_type column already exists in job_card.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.end();
  }
}

migrate();
