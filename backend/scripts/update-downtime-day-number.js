import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function updateDowntimeEntryTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Adding day_number and log_date to downtime_entry table...');
    
    // Check if columns exist first
    const [columns] = await connection.query('DESCRIBE downtime_entry');
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('day_number')) {
      await connection.query('ALTER TABLE downtime_entry ADD COLUMN day_number INT DEFAULT 1 AFTER job_card_id');
      console.log('✓ Added day_number column');
    }
    
    if (!columnNames.includes('log_date')) {
      await connection.query('ALTER TABLE downtime_entry ADD COLUMN log_date DATE AFTER day_number');
      // Set default log_date from created_at for existing records
      await connection.query('UPDATE downtime_entry SET log_date = DATE(created_at) WHERE log_date IS NULL');
      console.log('✓ Added log_date column');
    }
    
    console.log('✓ downtime_entry table updated successfully');
    
  } catch (err) {
    console.error('Error updating table:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

updateDowntimeEntryTable();
