#!/usr/bin/env node
import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const db = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('🔧 Adding rate_per_hour to workstation table\n');

    // Check if column exists
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'workstation' AND COLUMN_NAME = 'rate_per_hour' AND TABLE_SCHEMA = ?`,
      [process.env.DB_NAME || 'nobalcasting']
    );

    if (columns.length === 0) {
      console.log('🔧 Adding rate_per_hour column...');
      await db.execute(
        `ALTER TABLE workstation 
         ADD COLUMN rate_per_hour DECIMAL(10, 2) DEFAULT 0 AFTER capacity_per_hour`
      );
      console.log('✓ rate_per_hour column added successfully!');
    } else {
      console.log('✓ rate_per_hour column already exists');
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
