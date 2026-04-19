import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307'),
    multipleStatements: true
  });

  try {
    console.log('Migrating: add-job-card-buffers.sql...');
    const sql = fs.readFileSync(path.join(process.cwd(), 'scripts/add-job-card-buffers.sql'), 'utf8');
    
    await connection.query(sql);
    console.log('✓ Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
