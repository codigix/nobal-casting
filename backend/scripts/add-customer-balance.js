import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    console.log('Adding balance column to selling_customer table...');
    try {
      await connection.execute(`
        ALTER TABLE selling_customer 
        ADD COLUMN balance DECIMAL(15, 2) DEFAULT 0 AFTER credit_limit
      `);
      console.log('✓ Balance column added successfully');
    } catch (err) {
      if (err.code === 'ER_DUP_COLUMN_NAME') {
        console.log('! Balance column already exists');
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
