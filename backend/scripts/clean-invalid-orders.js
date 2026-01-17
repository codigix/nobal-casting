import mysql from 'mysql2/promise';

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function cleanInvalidOrders() {
  const conn = await mysql.createConnection(config);

  try {
    console.log('Cleaning invalid sales orders...');
    
    // Get all valid customer IDs
    const [validCustomers] = await conn.execute('SELECT customer_id FROM selling_customer');
    const validIds = new Set(validCustomers.map(c => c.customer_id));
    console.log('Valid customer IDs:', Array.from(validIds));
    
    // Get all orders with invalid customer IDs
    const [invalidOrders] = await conn.execute(
      'SELECT sales_order_id, customer_id FROM selling_sales_order'
    );
    
    const ordersToDelete = invalidOrders.filter(o => !validIds.has(o.customer_id));
    console.log(`Found ${ordersToDelete.length} orders with invalid customer IDs`);
    
    if (ordersToDelete.length > 0) {
      const orderIds = ordersToDelete.map(o => o.sales_order_id);
      console.log('Orders to delete:', orderIds);
      
      // Delete the invalid orders
      await conn.execute(
        `DELETE FROM selling_sales_order WHERE sales_order_id IN (${orderIds.map(() => '?').join(', ')})`
        , orderIds
      );
      
      console.log(`✅ Deleted ${ordersToDelete.length} invalid orders`);
    }
    
    // Verify
    const [remaining] = await conn.execute('SELECT COUNT(*) as count FROM selling_sales_order');
    console.log(`✅ Remaining orders: ${remaining[0].count}`);
    
    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanInvalidOrders();
