
import mysql from 'mysql2/promise';

async function update() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  console.log('Updating sales orders with new customer IDs...');
  
  await connection.query("UPDATE selling_sales_order SET customer_id = 'CUST-ACME-001' WHERE sales_order_id = 'SO-1768797561794'");
  await connection.query("UPDATE selling_sales_order SET customer_id = 'CUST-BETA-002' WHERE sales_order_id = 'SO-1768800653899'");
  await connection.query("UPDATE selling_sales_order SET customer_id = 'CUST-GAMMA-003' WHERE sales_order_id = 'SO-1768825092157'");
  
  console.log('✅ Sales orders updated successfully');

  const [orders] = await connection.query('SELECT sales_order_id, customer_id FROM selling_sales_order');
  console.log('Updated Orders:', JSON.stringify(orders, null, 2));

  await connection.end();
}

update();
