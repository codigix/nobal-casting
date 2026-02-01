
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
  });

  try {
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables:', tables.map(t => Object.values(t)[0]));

    for (const table of ['stock_balance', 'stock_ledger', 'warehouses', 'warehouse']) {
      try {
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        console.log(`\nColumns for ${table}:`);
        console.table(columns);
      } catch (e) {
        console.log(`\nTable ${table} not found or error: ${e.message}`);
      }
    }

    const [balances] = await connection.execute('SELECT * FROM stock_balance LIMIT 5');
    console.log('\nSample Stock Balances:');
    console.table(balances);

    const [ledger] = await connection.execute('SELECT * FROM stock_ledger ORDER BY id DESC LIMIT 5');
    console.log('\nLatest Stock Ledger entries:');
    console.table(ledger);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkDb();
