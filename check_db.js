
import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  const [customers] = await connection.query('SELECT COUNT(*) as count FROM selling_customer');
  const [orders] = await connection.query('SELECT COUNT(*) as count FROM selling_sales_order');
  
  console.log('Customers:', customers[0].count);
  console.log('Orders:', orders[0].count);
  
  if (customers[0].count > 0) {
    const [sampleCustomers] = await connection.query('SELECT * FROM selling_customer LIMIT 5');
    console.log('Sample Customers:', JSON.stringify(sampleCustomers, null, 2));
  }
  
  if (orders[0].count > 0) {
    const [sampleOrders] = await connection.query('SELECT * FROM selling_sales_order LIMIT 5');
    console.log('Sample Orders:', JSON.stringify(sampleOrders, null, 2));
  }

  await connection.end();
}

check();
