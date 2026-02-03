
import mysql from 'mysql2/promise';

const dbConfig = {
  host: '127.0.0.1',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307
};

async function check() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [jobCards] = await connection.query('SELECT job_card_id, work_order_id, operation, operation_sequence, planned_quantity, produced_quantity, accepted_quantity FROM job_card ORDER BY created_at DESC LIMIT 5');
    console.log('--- Recent Job Cards ---');
    console.table(jobCards);

    const [workOrders] = await connection.query('SELECT wo_id, item_code, quantity, status FROM work_order ORDER BY created_at DESC LIMIT 5');
    console.log('--- Recent Work Orders ---');
    console.table(workOrders);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
