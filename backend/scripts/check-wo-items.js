import mysql from 'mysql2/promise';

async function checkWOItems() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const woId = 'WO-SA-1773915478704-2';
    console.log(`Checking Work Order Items: ${woId}`);
    
    const [items] = await connection.execute(
      'SELECT item_code, required_qty, issued_qty, consumed_qty, returned_qty FROM work_order_item WHERE wo_id = ?',
      [woId]
    );
    
    console.table(items);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkWOItems();
