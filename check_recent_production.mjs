import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3307,
});

async function run() {
  try {
    console.log('--- Recent Time Logs ---');
    const [timeLogs] = await db.query('SELECT * FROM time_log ORDER BY created_at DESC LIMIT 5');
    console.log(JSON.stringify(timeLogs, null, 2));

    console.log('--- Recent Rejection Entries ---');
    try {
        const [rejections] = await db.query('SELECT * FROM rejection_entry ORDER BY created_at DESC LIMIT 5');
        console.log(JSON.stringify(rejections, null, 2));
    } catch (e) {
        console.log('Error fetching rejections:', e.message);
    }

    const woId = "WO-1770270801569-126";
    console.log(`--- Job Cards for ${woId} ---`);
    const [jcAll] = await db.query('SELECT job_card_id, operation, status, accepted_quantity FROM job_card WHERE work_order_id = ?', [woId]);
    console.log(JSON.stringify(jcAll, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
