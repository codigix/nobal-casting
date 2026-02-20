const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const tables = ['work_order', 'work_order_item', 'material_allocation', 'stock_ledger'];
    for (const table of tables) {
      console.log(`--- ${table} ---`);
      const [rows] = await connection.query(`DESCRIBE ${table}`);
      console.table(rows);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

run();
