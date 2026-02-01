
import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const db = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT) || 3307,
});

async function run() {
  try {
    console.log('--- ITEMS ---');
    const [items] = await db.query('SELECT item_code, name, item_group, uom, is_active FROM item LIMIT 20');
    console.table(items);

    console.log('--- STOCK BALANCE ---');
    const [stock] = await db.query('SELECT * FROM stock_balance LIMIT 20');
    console.table(stock);

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
