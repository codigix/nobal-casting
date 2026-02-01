
import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ItemModel } from './backend/src/models/ItemModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const db = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT) || 3307,
});

async function run() {
  try {
    const model = new ItemModel(db);
    const items = await model.getAll();
    
    console.log('--- ITEMS WITH QUANTITY ---');
    console.table(items.map(i => ({
      item_code: i.item_code,
      name: i.name,
      quantity: i.quantity,
      maintain_stock: i.maintain_stock
    })).filter(i => i.quantity > 0 || true).slice(0, 20));

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
