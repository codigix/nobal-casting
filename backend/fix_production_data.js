import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
import ProductionModel from './src/models/ProductionModel.js';

dotenv.config();

const db = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3307,
});

async function fixData() {
  try {
    const model = new ProductionModel(db);
    const woId = 'WO-1770270801569-126';
    
    console.log(`Fixing data for Work Order: ${woId}`);
    
    // Get all job cards for this work order
    const [jcRows] = await db.query('SELECT job_card_id FROM job_card WHERE work_order_id = ?', [woId]);
    
    for (const jc of jcRows) {
      console.log(`Syncing Job Card: ${jc.job_card_id}`);
      const result = await model._syncJobCardQuantities(jc.job_card_id);
      console.log(`Result:`, JSON.stringify(result, null, 2));
    }
    
    console.log('Done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fixData();
