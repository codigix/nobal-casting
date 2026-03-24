
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3307'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function runMigration() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to database');

    // 1. Check if wip_warehouse column exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'work_order' AND COLUMN_NAME = 'wip_warehouse' AND TABLE_SCHEMA = ?`,
      [config.database]
    );

    if (columns.length === 0) {
      console.log('Adding wip_warehouse column to work_order table...');
      await connection.execute(
        "ALTER TABLE work_order ADD COLUMN wip_warehouse VARCHAR(100) AFTER target_warehouse"
      );
      console.log('✓ Column wip_warehouse added successfully.');
    } else {
      console.log('✓ Column wip_warehouse already exists.');
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
