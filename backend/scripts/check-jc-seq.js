import mysql from 'mysql2/promise';

async function checkJobCardSequences() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const woId = 'WO-SA-1773915478704-2';
    console.log(`Checking Job Card Sequences for Work Order: ${woId}`);
    
    const [jobCards] = await connection.execute(
      'SELECT job_card_id, operation, operation_sequence, planned_quantity, accepted_quantity, produced_quantity FROM job_card WHERE work_order_id = ? ORDER BY operation_sequence ASC',
      [woId]
    );
    
    console.table(jobCards);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkJobCardSequences();
