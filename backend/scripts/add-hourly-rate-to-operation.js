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
    console.log('Checking for hourly_rate column in operation table...');
    const [columns] = await db.query('SHOW COLUMNS FROM operation');
    console.log('Existing columns:', columns.map(c => c.Field));
    const exists = columns.some(c => c.Field === 'hourly_rate');
    
    if (!exists) {
      console.log('Adding hourly_rate column to operation table...');
      await db.query('ALTER TABLE operation ADD COLUMN hourly_rate DECIMAL(18, 2) DEFAULT 0 AFTER description');
      console.log('hourly_rate column added successfully.');
    } else {
      console.log('hourly_rate column already exists.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.end();
  }
}

migrate();
