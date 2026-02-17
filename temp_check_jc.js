import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'backend/.env' });

async function main() {
  const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    const [rows] = await pool.query('SELECT job_card_id, operator_id, machine_id FROM job_card LIMIT 10');
    console.log(JSON.stringify(rows, null, 2));
    
    const [empRows] = await pool.query('SELECT employee_id, first_name, last_name FROM employee_master LIMIT 5');
    console.log('Employee samples:', JSON.stringify(empRows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
