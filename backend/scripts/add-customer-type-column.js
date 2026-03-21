import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = createPool({
  host: '127.0.0.1',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307,
});

async function run() {
  try {
    await db.query('ALTER TABLE selling_customer ADD COLUMN customer_type VARCHAR(50) DEFAULT "other" AFTER name');
    console.log('Successfully added customer_type column to selling_customer');
  } catch (e) {
    console.error('Failed to add column:', e.message);
  } finally {
    process.exit();
  }
}
run();