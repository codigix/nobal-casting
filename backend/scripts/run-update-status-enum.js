import mysql from 'mysql2/promise';

async function updateStatusEnum() {
  let db;
  
  try {
    // Try with root password first
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
  } catch (e) {
    // Fall back to empty password
    console.log('Root password failed, trying empty password...');
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'nobalcasting'
    });
  }

  try {
    console.log('Checking current status enum...');
    const [result] = await db.execute('DESCRIBE selling_sales_order');
    const statusCol = result.find(r => r.Field === 'status');
    console.log('Current status column:', statusCol.Type);
    
    console.log('\nUpdating status enum to include "confirmed"...');
    await db.execute(`
      ALTER TABLE selling_sales_order 
      MODIFY COLUMN status ENUM('draft', 'confirmed', 'production', 'complete', 'on_hold', 'dispatched', 'delivered') DEFAULT 'draft'
    `);
    
    console.log('✓ Status column updated successfully');
    
    const [newResult] = await db.execute('DESCRIBE selling_sales_order');
    const newStatusCol = newResult.find(r => r.Field === 'status');
    console.log('New status column:', newStatusCol.Type);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

updateStatusEnum();
