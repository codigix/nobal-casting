import mysql from 'mysql2/promise';

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });
  
  try {
    const [columns] = await connection.query('DESC stock_balance');
    console.log("stock_balance schema:", JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkSchema();
