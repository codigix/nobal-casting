import mysql from 'mysql2/promise';

async function checkProjectData() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [workOrders] = await connection.execute(
      `SELECT wo_id, sales_order_id, item_code, quantity FROM work_order ORDER BY created_at DESC LIMIT 10`
    );
    console.log('\nRecent Work Orders:');
    console.table(workOrders);

    if (workOrders.length > 0) {
      const woIds = workOrders.map(wo => wo.wo_id);
      const [jobCards] = await connection.execute(
        `SELECT job_card_id, work_order_id, operation, status, planned_quantity, produced_quantity, accepted_quantity 
         FROM job_card WHERE work_order_id IN (${woIds.map(() => '?').join(',')})`,
        woIds
      );
      console.log('\nJob Cards:');
      console.table(jobCards);
      
      const [productionEntries] = await connection.execute(
        `SELECT pe_id, work_order_id, job_card_id, entry_date, quantity_produced, accepted_quantity 
         FROM production_entry WHERE work_order_id IN (${woIds.map(() => '?').join(',')})`,
        woIds
      );
      console.log('\nProduction Entries:');
      console.table(productionEntries);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkProjectData();
