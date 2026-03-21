const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    console.log('Adding columns to time_log...');
    try {
      await connection.query('ALTER TABLE time_log ADD COLUMN from_period VARCHAR(2) AFTER from_time');
    } catch (e) { console.log('from_period already exists or error:', e.message); }
    
    try {
      await connection.query('ALTER TABLE time_log ADD COLUMN to_period VARCHAR(2) AFTER to_time');
    } catch (e) { console.log('to_period already exists or error:', e.message); }

    console.log('Adding columns to downtime_entry...');
    try {
      await connection.query('ALTER TABLE downtime_entry ADD COLUMN from_period VARCHAR(2) AFTER from_time');
    } catch (e) { console.log('from_period already exists or error:', e.message); }
    
    try {
      await connection.query('ALTER TABLE downtime_entry ADD COLUMN to_period VARCHAR(2) AFTER to_time');
    } catch (e) { console.log('to_period already exists or error:', e.message); }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
