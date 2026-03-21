import mysql from 'mysql2/promise';

async function checkWOSummary() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const woId = 'WO-SA-1773915478704-2';
    console.log(`Checking Work Order Summary: ${woId}`);
    
    const [wo] = await connection.execute(
      'SELECT wo_id, status, quantity, produced_qty, accepted_qty, rejected_qty FROM work_order WHERE wo_id = ?',
      [woId]
    );
    
    console.table(wo);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkWOSummary();
