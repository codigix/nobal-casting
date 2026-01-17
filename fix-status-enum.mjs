import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nobalcasting'
});

try {
  console.log('Modifying status column to include "confirmed"...');
  
  await conn.execute(`
    ALTER TABLE selling_sales_order 
    MODIFY COLUMN status ENUM('draft', 'confirmed', 'production', 'complete', 'on_hold', 'dispatched', 'delivered') DEFAULT 'draft'
  `);
  
  console.log('✓ Status column updated successfully');
} catch (error) {
  console.error('Error:', error.message);
}

await conn.end();
