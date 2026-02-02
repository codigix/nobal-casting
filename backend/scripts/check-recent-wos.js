import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function checkRecentWOs() {
  try {
    console.log(`\n--- Recent Work Orders ---`);
    const [wos] = await pool.query('SELECT * FROM work_order ORDER BY created_at DESC LIMIT 5');
    console.table(wos);

    for (const wo of wos) {
        console.log(`\n--- Operations for ${wo.wo_id} ---`);
        const [ops] = await pool.query('SELECT * FROM work_order_operation WHERE wo_id = ?', [wo.wo_id]);
        console.table(ops);
        
        console.log(`\n--- Job Cards for ${wo.wo_id} ---`);
        const [jcs] = await pool.query('SELECT * FROM job_card WHERE work_order_id = ?', [wo.wo_id]);
        console.table(jcs);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkRecentWOs();
