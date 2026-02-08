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
    const woId = 'WO-1770270801569-126';
    await db.query('UPDATE job_card SET produced_quantity = 10, accepted_quantity = 10, status = "completed" WHERE work_order_id = ?', [woId]);
    console.log(`Updated job cards for ${woId}`);
    
    const [rows] = await db.query('SELECT job_card_id, produced_quantity, accepted_quantity FROM job_card WHERE work_order_id = ?', [woId]);
    console.log('Current State:', JSON.stringify(rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
