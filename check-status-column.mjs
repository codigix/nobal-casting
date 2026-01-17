import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
}).catch(e => {
  console.log('Trying with empty password...');
  return mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nobalcasting'
  });
});

const [result] = await conn.execute('DESCRIBE selling_sales_order');
const statusCol = result.find(r => r.Field === 'status');
console.log('Status column:', statusCol);

await conn.end();
