
import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const db = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT) || 3306,
});

async function run() {
  try {
    const [balanceSchema] = await db.query('DESCRIBE stock_balance');
    console.log('--- stock_balance SCHEMA ---');
    console.table(balanceSchema);

    const [createTable] = await db.query('SHOW CREATE TABLE stock_balance');
    console.log('--- CREATE TABLE stock_balance ---');
    console.log(createTable[0]['Create Table']);

    const [ledgerSchema] = await db.query('DESCRIBE stock_ledger');
    console.log('--- stock_ledger SCHEMA ---');
    console.table(ledgerSchema);

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
