import mysql from 'mysql2/promise';

async function runMigration() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    
    const sql = 'ALTER TABLE selling_sales_order MODIFY COLUMN status ENUM(\'draft\', \'production\', \'complete\', \'on_hold\', \'dispatched\', \'delivered\') DEFAULT \'draft\'';
    
    console.log('Running migration...');
    await connection.execute(sql);
    console.log('✓ Status ENUM updated successfully');
    
    await connection.end();
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
