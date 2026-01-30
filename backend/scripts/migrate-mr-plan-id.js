import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Adding production_plan_id to material_request...');
    await connection.execute('ALTER TABLE material_request ADD COLUMN production_plan_id VARCHAR(100) NULL AFTER mr_id');
    console.log('Adding index to production_plan_id...');
    await connection.execute('CREATE INDEX idx_material_request_plan_id ON material_request(production_plan_id)');
    console.log('Migration successful!');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    await connection.end();
  }
}

migrate();
