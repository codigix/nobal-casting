import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Checking for target_warehouse column in work_order table...');
    
    const [cols] = await connection.query('SHOW COLUMNS FROM work_order LIKE "target_warehouse"');
    
    if (cols.length === 0) {
      console.log('Adding target_warehouse column...');
      await connection.query('ALTER TABLE work_order ADD COLUMN target_warehouse VARCHAR(100) NULL');
      console.log('✓ target_warehouse column added successfully');
    } else {
      console.log('✓ target_warehouse column already exists');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

migrate();
