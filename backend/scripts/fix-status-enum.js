import mysql from 'mysql2/promise';

const db = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

try {
  console.log('Checking current status column...');
  const [result] = await db.execute('DESCRIBE selling_sales_order');
  const statusCol = result.find(r => r.Field === 'status');
  console.log('Current status column:', statusCol.Type);
  
  console.log('Modifying status column to include "confirmed"...');
  
  await db.execute(`
    ALTER TABLE selling_sales_order 
    MODIFY COLUMN status ENUM('draft', 'confirmed', 'production', 'complete', 'on_hold', 'dispatched', 'delivered') DEFAULT 'draft'
  `);
  
  console.log('✓ Status column updated successfully');
  
  const [newResult] = await db.execute('DESCRIBE selling_sales_order');
  const newStatusCol = newResult.find(r => r.Field === 'status');
  console.log('New status column:', newStatusCol.Type);
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await db.end();
}
