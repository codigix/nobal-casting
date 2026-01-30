import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'erp_user',
    password: process.env.DB_PASSWORD || 'erp_password',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  });

  const [rows] = await connection.execute('DESCRIBE job_card');
  console.log('JOB CARD SCHEMA:');
  console.table(rows);
  
  const [soRows] = await connection.execute('DESCRIBE selling_sales_order');
  console.log('SO SCHEMA:');
  console.table(soRows);

  const [woRows] = await connection.execute('DESCRIBE work_order');
  console.log('WO SCHEMA:');
  console.table(woRows);

  await connection.end();
})();
