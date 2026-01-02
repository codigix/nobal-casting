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

async function testWorkOrder() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('\n📋 Checking work_order table structure...\n');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'work_order' AND TABLE_SCHEMA = DATABASE()
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columns in work_order table:');
    columns.forEach(col => {
      console.log(`  • ${col.COLUMN_NAME} (${col.COLUMN_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n📊 Fetching work order WO-1767175038828...\n');
    const [workOrders] = await connection.execute(
      'SELECT wo_id, item_code, quantity, sales_order_id, bom_no, planned_start_date, planned_end_date, actual_start_date, actual_end_date, expected_delivery_date FROM work_order WHERE wo_id = ?',
      ['WO-1767175038828']
    );

    if (workOrders.length > 0) {
      const wo = workOrders[0];
      console.log('Work Order Data:');
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
    } else {
      console.log('Work order not found');
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

testWorkOrder();
