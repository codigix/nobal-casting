import mysql from 'mysql2/promise';

async function check() {
  const db = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nobalcasting'
  });
  
  const [rows] = await db.execute('DESCRIBE account_ledger');
  console.log('Account Ledger Schema:');
  console.log(JSON.stringify(rows, null, 2));

  const [rows2] = await db.execute('DESCRIBE selling_customer');
  console.log('Selling Customer Schema:');
  console.log(JSON.stringify(rows2, null, 2));
  
  await db.end();
}

check().catch(console.error);
