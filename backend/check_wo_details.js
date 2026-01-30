import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306,
});

async function checkWO() {
  try {
    const woId = 'WO-1768825111111';
    
    // 1. Get Work Order
    const [woRows] = await db.query('SELECT * FROM work_order WHERE wo_id = ?', [woId]);
    const wo = woRows[0];
    
    if (!wo) {
      console.log('Work Order not found');
      process.exit(0);
    }
    
    console.log('--- Work Order ---');
    console.log(JSON.stringify(wo, null, 2));
    
    // 2. Get Work Order Operations
    const [ops] = await db.query('SELECT * FROM work_order_operation WHERE wo_id = ? ORDER BY sequence', [woId]);
    console.log('\n--- Operations ---');
    console.log(JSON.stringify(ops, null, 2));
    
    // 3. Get Work Order Items
    const [items] = await db.query('SELECT * FROM work_order_item WHERE wo_id = ?', [woId]);
    console.log('\n--- Items ---');
    console.log(JSON.stringify(items, null, 2));
    
    // 4. Get Sales Order if exists
    if (wo.sales_order_id) {
      const [soRows] = await db.query('SELECT * FROM selling_sales_order WHERE sales_order_id = ?', [wo.sales_order_id]);
      const so = soRows[0];
      console.log('\n--- Sales Order ---');
      console.log(JSON.stringify(so, null, 2));
      
      if (so && so.items) {
        console.log('\n--- Sales Order Items (from JSON) ---');
        try {
          const soItems = typeof so.items === 'string' ? JSON.parse(so.items) : so.items;
          console.log(JSON.stringify(soItems, null, 2));
        } catch (e) {
          console.log('Error parsing SO items JSON');
        }
      }
    }
    
    // 5. Get BOM if exists
    if (wo.bom_no) {
        const [bomRows] = await db.query('SELECT * FROM bom WHERE bom_id = ?', [wo.bom_no]);
        console.log('\n--- BOM ---');
        console.log(JSON.stringify(bomRows[0], null, 2));
    }

    // 6. Get Job Cards
    const [jcRows] = await db.query('SELECT * FROM job_card WHERE work_order_id = ?', [woId]);
    console.log('\n--- Job Cards ---');
    console.log(JSON.stringify(jcRows, null, 2));

    for (const jc of jcRows) {
        console.log(`\n--- Time Logs for ${jc.job_card_id} ---`);
        const [tlRows] = await db.query('SELECT * FROM time_log WHERE job_card_id = ?', [jc.job_card_id]);
        console.log(JSON.stringify(tlRows, null, 2));

        console.log(`\n--- Rejections for ${jc.job_card_id} ---`);
        const [rejRows] = await db.query('SELECT * FROM rejection_entry WHERE job_card_id = ?', [jc.job_card_id]);
        console.log(JSON.stringify(rejRows, null, 2));
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkWO();
