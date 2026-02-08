import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: 3307,
});

async function run() {
  try {
    const [rows] = await db.query('DESCRIBE work_order_item');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
