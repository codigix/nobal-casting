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
    const woId = 'WO-1770270801569-126';
    const [rows] = await db.query('SELECT * FROM job_card WHERE work_order_id = ?', [woId]);
    console.log('Job Cards for WO:', woId);
    console.log(JSON.stringify(rows, null, 2));
    
    for (const jc of rows) {
        const [logs] = await db.query('SELECT * FROM time_log WHERE job_card_id = ?', [jc.job_card_id]);
        console.log(`Logs for JC ${jc.job_card_id}:`, logs.length);
        const [rejs] = await db.query('SELECT * FROM rejection_entry WHERE job_card_id = ?', [jc.job_card_id]);
        console.log(`Rejections for JC ${jc.job_card_id}:`, rejs.length);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
