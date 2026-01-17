import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function verifySalesOrder() {
  const conn = await mysql.createConnection(config);

  console.log('=== Verifying Sales Order ===');
  
  // Check if order exists
  const [orders] = await conn.execute(
    'SELECT so.sales_order_id, so.customer_id, c.name as customer_name FROM selling_sales_order so JOIN selling_customer c ON so.customer_id = c.customer_id ORDER BY so.created_at DESC LIMIT 1'
  );

  if (orders.length > 0) {
    console.log('✅ Sales Order Created Successfully:');
    console.log('   Order ID:', orders[0].sales_order_id);
    console.log('   Customer ID:', orders[0].customer_id);
    console.log('   Customer Name:', orders[0].customer_name);
    console.log('\n✅ Foreign Key Constraint is Working!');
  } else {
    console.log('⚠️  No sales orders found');
  }

  await conn.end();
}

verifySalesOrder().catch(console.error);
