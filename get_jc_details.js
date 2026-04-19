import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3307
};

async function query() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to database');

    const wo_id = 'WO-SA-1775818466267-1';
    const [rows] = await connection.execute('SELECT job_card_id, operation, operation_sequence, planned_quantity, produced_quantity, accepted_quantity, transferred_quantity, status FROM job_card WHERE work_order_id = ? ORDER BY operation_sequence', [wo_id]);
    console.log('Job Cards for Work Order ' + wo_id + ':');
    console.table(rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

query();
