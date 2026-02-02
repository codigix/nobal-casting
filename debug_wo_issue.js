
const mysql = require('mysql2/promise');

async function debug() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log('--- Work Order Details ---');
    const [wo] = await connection.execute("SELECT wo_id, item_code, bom_no, status FROM work_order WHERE wo_id = 'WO-1770032753214'");
    console.log(JSON.stringify(wo, null, 2));

    if (wo.length > 0) {
      const itemCode = wo[0].item_code;
      console.log(`\n--- BOMs for Item: ${itemCode} ---`);
      const [boms] = await connection.execute("SELECT bom_id, is_default, is_active FROM bom WHERE item_code = ?", [itemCode]);
      console.log(JSON.stringify(boms, null, 2));

      console.log('\n--- Job Cards for Work Order ---');
    const [jcs] = await connection.execute("SELECT * FROM job_card WHERE work_order_id = 'WO-1770032753214'");
    console.log(JSON.stringify(jcs, null, 2));

    console.log('\n--- Operations for Work Order (work_order_operation table) ---');
    const [woOps] = await connection.execute("SELECT * FROM work_order_operation WHERE wo_id = 'WO-1770032753214'");
    console.log(JSON.stringify(woOps, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

debug();
