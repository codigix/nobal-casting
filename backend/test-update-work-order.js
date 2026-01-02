import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testUpdate() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('\n✏️  Updating work order with test data...\n');
    
    const testData = {
      wo_id: 'WO-1767175038828',
      sales_order_id: 'SO-001',
      bom_no: 'BOM-001',
      planned_start_date: '2025-01-15 10:00:00',
      planned_end_date: '2025-01-20 18:00:00',
      actual_start_date: '2025-01-15 09:30:00',
      actual_end_date: '2025-01-19 17:45:00',
      expected_delivery_date: '2025-01-22 00:00:00'
    };

    await connection.execute(
      `UPDATE work_order SET 
        sales_order_id = ?,
        bom_no = ?,
        planned_start_date = ?,
        planned_end_date = ?,
        actual_start_date = ?,
        actual_end_date = ?,
        expected_delivery_date = ?
       WHERE wo_id = ?`,
      [
        testData.sales_order_id,
        testData.bom_no,
        testData.planned_start_date,
        testData.planned_end_date,
        testData.actual_start_date,
        testData.actual_end_date,
        testData.expected_delivery_date,
        testData.wo_id
      ]
    );

    console.log('✓ Update completed\n');

    console.log('📊 Verifying data was saved...\n');
    const [workOrders] = await connection.execute(
      'SELECT wo_id, item_code, quantity, sales_order_id, bom_no, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date FROM work_order WHERE wo_id = ?',
      ['WO-1767175038828']
    );

    if (workOrders.length > 0) {
      const wo = workOrders[0];
      console.log('Updated Work Order Data:');
      console.log(`  ID: ${wo.wo_id}`);
      console.log(`  Item: ${wo.item_code}`);
      console.log(`  Qty: ${wo.quantity}`);
      console.log(`  Sales Order ID: ${wo.sales_order_id}`);
      console.log(`  BOM No: ${wo.bom_no}`);
      console.log(`  Planned Start: ${wo.planned_start_date}`);
      console.log(`  Planned End: ${wo.planned_end_date}`);
      console.log(`  Actual Start: ${wo.actual_start_date}`);
      console.log(`  Actual End: ${wo.actual_end_date}`);
      console.log(`  Expected Delivery: ${wo.expected_delivery_date}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

testUpdate();
