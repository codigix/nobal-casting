import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function describeTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('DESCRIBE job_card');
    console.table(rows);
    
    const [peRows] = await connection.query('DESCRIBE production_entry');
    console.table(peRows);
  } catch (err) {
    console.error(err);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

describeTable();
