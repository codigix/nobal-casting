const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log('--- All Job Cards ---');
    const [jcs] = await connection.execute(
      'SELECT job_card_id, work_order_id, operation, planned_quantity, produced_quantity FROM job_card'
    );
    console.log(JSON.stringify(jcs, null, 2));

    console.log('\n--- All Production Entries ---');
    const [logs] = await connection.execute(
        'SELECT * FROM production_entry'
    );
    console.log(JSON.stringify(logs, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

run();
