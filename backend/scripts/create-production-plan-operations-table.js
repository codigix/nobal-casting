import mysql from 'mysql2/promise';

async function createTable() {
  let db;
  
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
  } catch (e) {
    console.log('Root password failed, trying empty password...');
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'nobalcasting'
    });
  }

  try {
    console.log('Creating production_plan_operations table...');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS production_plan_operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        plan_id VARCHAR(100) NOT NULL,
        operation_name VARCHAR(255),
        total_time_minutes DECIMAL(18,6),
        total_hours DECIMAL(18,6),
        hourly_rate DECIMAL(15,2),
        total_cost DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES production_plan(plan_id) ON DELETE CASCADE,
        INDEX idx_plan_id (plan_id)
      )
    `);
    
    console.log('✓ production_plan_operations table created successfully');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

createTable();
