const mysql = require('mysql2/promise');

async function checkWO() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'nobalcasting'
  });

  try {
    const [allWos] = await connection.query("SELECT wo_id FROM work_order");
    console.log('All WO IDs:', allWos.map(w => w.wo_id));

    const [wos] = await connection.query("SELECT wo_id, item_code, bom_no, quantity FROM work_order ORDER BY created_at DESC LIMIT 5");
    console.log('Recent Work Orders:', JSON.stringify(wos, null, 2));

    const targetId = 'WO-1770114188729';
    const [wo] = await connection.query("SELECT * FROM work_order WHERE wo_id = ?", [targetId]);
    console.log('Work Order:', JSON.stringify(wo, null, 2));

    if (wo.length > 0) {
      const bom_id = wo[0].bom_no || wo[0].bom_id;
      console.log('BOM ID:', bom_id);
      
      const [ops] = await connection.query("SELECT * FROM work_order_operation WHERE wo_id = 'WO-1770114188729'");
      console.log('WO Operations:', JSON.stringify(ops, null, 2));

      if (bom_id) {
        const [bomOps] = await connection.query("SELECT * FROM bom_operation WHERE bom_id = ?", [bom_id]);
        console.log('BOM Operations:', JSON.stringify(bomOps, null, 2));
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkWO();
