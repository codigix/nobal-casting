import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function main() {
  try {
    const [wos] = await pool.query('SELECT wo_id, item_code, bom_no, created_at FROM work_order ORDER BY created_at DESC LIMIT 10');
    console.log('Recent Work Orders:');
    console.table(wos);

    for (const wo of wos) {
      const [jcs] = await pool.query('SELECT count(*) as count FROM job_card WHERE work_order_id = ?', [wo.wo_id]);
      console.log(`WO: ${wo.wo_id} | Job Cards: ${jcs[0].count} | BOM: ${wo.bom_no}`);
      
      if (jcs[0].count === 0 && wo.bom_no) {
        const [bomOps] = await pool.query('SELECT count(*) as count FROM bom_operation WHERE bom_id = ?', [wo.bom_no]);
        console.log(`  -> BOM ${wo.bom_no} has ${bomOps[0].count} operations`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
