import mysql from 'mysql2/promise';

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'nobalcasting'
  });

  const [rows] = await connection.query('DESCRIBE stock_ledger');
  console.log(JSON.stringify(rows, null, 2));
  
  await connection.end();
}

checkSchema().catch(console.error);
