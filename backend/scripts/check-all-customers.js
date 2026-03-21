import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = createPool({
  host: '127.0.0.1',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307,
});

async function run() {
  try {
    const [customers] = await db.query('SELECT * FROM customer');
    console.log('All Customers (production table):', JSON.stringify(customers, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();