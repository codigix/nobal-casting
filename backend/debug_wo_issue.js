
const mysql = require('mysql2/promise');

async function checkWO() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const wo_id = 'WO-1770112911670';
    console.log(`Checking Work Order: ${wo_id}`);

    const [workOrders] = await connection.query('SELECT * FROM work_order WHERE wo_id = ?', [wo_id]);
    console.log('Work Order Record:', JSON.stringify(workOrders[0], null, 2));

    if (workOrders.length === 0) {
      console.log('Work Order not found in database.');
      return;
    }

    const [woOps] = await connection.query('SELECT * FROM work_order_operation WHERE wo_id = ?', [wo_id]);
    console.log(`Work Order Operations (${woOps.length}):`, JSON.stringify(woOps, null, 2));

    const item_code = workOrders[0].item_code;
    const bom_no = workOrders[0].bom_no;

    if (bom_no) {
      console.log(`Checking BOM: ${bom_no}`);
      const [bomOps] = await connection.query('SELECT * FROM bom_operation WHERE bom_id = ?', [bom_no]);
      console.log(`BOM Operations (${bomOps.length}):`, JSON.stringify(bomOps, null, 2));
    } else {
      console.log('No BOM linked to this Work Order.');
      const [defaultBoms] = await connection.query(
        'SELECT bom_id FROM bom WHERE item_code = ? AND is_active = 1 ORDER BY is_default DESC, created_at DESC LIMIT 1',
        [item_code]
      );
      if (defaultBoms && defaultBoms.length > 0) {
        console.log(`Default BOM found for ${item_code}: ${defaultBoms[0].bom_id}`);
        const [bomOps] = await connection.query('SELECT * FROM bom_operation WHERE bom_id = ?', [defaultBoms[0].bom_id]);
        console.log(`Default BOM Operations (${bomOps.length}):`, JSON.stringify(bomOps, null, 2));
      } else {
        console.log(`No default BOM found for item: ${item_code}`);
      }
    }

    const [jobCards] = await connection.query('SELECT * FROM job_card WHERE work_order_id = ?', [wo_id]);
    console.log(`Job Cards (${jobCards.length}):`, JSON.stringify(jobCards, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

checkWO();
