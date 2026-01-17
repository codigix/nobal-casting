import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function checkData() {
  const conn = await mysql.createConnection(config);

  console.log('=== selling_sales_order rows ===');
  const [orders] = await conn.execute('SELECT COUNT(*) as count FROM selling_sales_order');
  console.log('Total orders:', orders[0].count);

  if (orders[0].count > 0) {
    const [orderRows] = await conn.execute('SELECT sales_order_id, customer_id FROM selling_sales_order LIMIT 10');
    console.log('Sample orders:', orderRows);
  }

  console.log('\n=== selling_customer rows ===');
  const [customers] = await conn.execute('SELECT customer_id, name FROM selling_customer');
  console.log('Total customers:', customers.length);
  console.log('Customer IDs:', customers.map(c => c.customer_id));

  await conn.end();
}

checkData().catch(console.error);
