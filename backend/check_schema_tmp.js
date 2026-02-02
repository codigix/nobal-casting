import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
  });
  
  const [jc] = await db.query('SHOW COLUMNS FROM job_card');
  console.log('job_card columns:', jc.map(c => c.Field));
  
  const [tl] = await db.query('SHOW COLUMNS FROM time_log');
  console.log('time_log columns:', tl.map(c => c.Field));
  
  await db.end();
}

check();
