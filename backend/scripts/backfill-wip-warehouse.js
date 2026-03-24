
import mysql from 'mysql2/promise';

async function backfillWIPWarehouse() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log('Backfilling wip_warehouse in work_order...');
    const [result] = await connection.execute(
      "UPDATE work_order SET wip_warehouse = 'Work In Progress' WHERE wip_warehouse IS NULL"
    );
    console.log(`✓ Updated ${result.affectedRows} work orders.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

backfillWIPWarehouse();
