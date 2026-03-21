import mysql from 'mysql2/promise';

async function checkProductionEntries() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const woId = 'WO-SA-1773915478704-2';
    console.log(`Checking Production Entries for Work Order: ${woId}`);
    
    const [entries] = await connection.execute(
      'SELECT * FROM production_entry WHERE work_order_id = ?',
      [woId]
    );
    
    console.table(entries);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkProductionEntries();
