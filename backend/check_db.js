import mysql from 'mysql2/promise';

async function checkPlans() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [plans] = await connection.query('SELECT * FROM production_plan ORDER BY created_at DESC LIMIT 5');
    console.log('Production Plans:', JSON.stringify(plans, null, 2));

    const [workOrders] = await connection.query('SELECT * FROM work_order ORDER BY created_at DESC LIMIT 5');
    console.log('Recent Work Orders:', JSON.stringify(workOrders, null, 2));

    const [bomItems] = await connection.query('SELECT bom_id, item_code, description FROM bom LIMIT 10');
    console.log('BOM Items:', JSON.stringify(bomItems, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkPlans();
