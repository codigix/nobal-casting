import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function checkWOOperations() {
  const wo_id = 'WO-1770021392754';
  try {
    console.log(`\n--- Checking Work Order: ${wo_id} ---`);
    const [wo] = await pool.query('SELECT * FROM work_order WHERE wo_id = ?', [wo_id]);
    console.table(wo);

    console.log(`\n--- Operations for ${wo_id} (from work_order_operation) ---`);
    const [ops] = await pool.query('SELECT * FROM work_order_operation WHERE wo_id = ?', [wo_id]);
    console.table(ops);

    console.log(`\n--- Job Cards for ${wo_id} ---`);
    const [jcs] = await pool.query('SELECT * FROM job_card WHERE work_order_id = ?', [wo_id]);
    console.table(jcs);

    if (wo.length > 0) {
        const bom_no = wo[0].bom_no || wo[0].bom_id;
        if (bom_no) {
            console.log(`\n--- BOM Operations for ${bom_no} ---`);
            const [bomOps] = await pool.query('SELECT * FROM bom_operation WHERE bom_id = ?', [bom_no]);
            console.table(bomOps);
        }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkWOOperations();
