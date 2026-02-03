import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function checkStockBalance() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    const [cols] = await connection.query('DESCRIBE stock_balance');
    console.log('Columns in stock_balance:');
    console.table(cols);

  } catch (error) {
    console.error('Error checking stock_balance:', error);
  } finally {
    await connection.end();
  }
}

checkStockBalance();
