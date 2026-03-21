import mysql from 'mysql2/promise';

async function checkOperations() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const woId = 'WO-SA-1773915478704-2';
    console.log(`Checking Operations for Work Order: ${woId}`);
    
    const [ops] = await connection.execute(
      'SELECT * FROM work_order_operation WHERE wo_id = ? ORDER BY sequence ASC',
      [woId]
    );
    
    console.table(ops);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkOperations();
