
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT) || 3306
  });

  try {
    console.log('Migrating selling_delivery_note table...');

    // Add job_card_id if missing
    try {
      await connection.query('ALTER TABLE selling_delivery_note ADD COLUMN job_card_id VARCHAR(50) AFTER sales_order_id');
      console.log('Added job_card_id column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('job_card_id already exists.');
      else throw e;
    }

    // Add carrier_name if missing
    try {
      await connection.query('ALTER TABLE selling_delivery_note ADD COLUMN carrier_name VARCHAR(100) AFTER vehicle_info');
      console.log('Added carrier_name column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('carrier_name already exists.');
      else throw e;
    }

    // Add tracking_number if missing
    try {
      await connection.query('ALTER TABLE selling_delivery_note ADD COLUMN tracking_number VARCHAR(100) AFTER carrier_name');
      console.log('Added tracking_number column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('tracking_number already exists.');
      else throw e;
    }

    // Add is_partial if missing
    try {
      await connection.query('ALTER TABLE selling_delivery_note ADD COLUMN is_partial BOOLEAN DEFAULT FALSE AFTER tracking_number');
      console.log('Added is_partial column.');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('is_partial already exists.');
      else throw e;
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
