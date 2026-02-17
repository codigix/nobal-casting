
import mysql from 'mysql2/promise';

async function checkPlan(planId) {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log(`Checking Plan: ${planId}`);
    
    const [plans] = await db.execute('SELECT * FROM production_plan WHERE plan_id = ?', [planId]);
    console.log('Plan Header:', plans[0]);

    const [fgItems] = await db.execute('SELECT * FROM production_plan_fg WHERE plan_id = ?', [planId]);
    console.log('FG Items:', fgItems);

    const [subAsms] = await db.execute('SELECT * FROM production_plan_sub_assembly WHERE plan_id = ?', [planId]);
    console.log('Sub-Assemblies:', subAsms);

    const [workOrders] = await db.execute('SELECT wo_id, item_code, status, parent_wo_id FROM work_order WHERE production_plan_id = ?', [planId]);
    console.log('Existing Work Orders for this plan:', workOrders);

    const [allWorkOrders] = await db.execute('SELECT wo_id, item_code, status, production_plan_id FROM work_order WHERE production_plan_id IS NOT NULL');
    console.log('All Work Orders with any Plan ID:', allWorkOrders);

    for (const wo of workOrders) {
        const [jobCards] = await db.execute('SELECT job_card_id, operation, status FROM job_card WHERE work_order_id = ?', [wo.wo_id]);
        console.log(`Job Cards for ${wo.wo_id}:`, jobCards);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkPlan('PP-1771242474517');
