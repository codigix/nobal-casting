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

async function updateTimeLogTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Updating time_log table...');
    
    // Check if columns exist
    const [columns] = await connection.query('SHOW COLUMNS FROM time_log');
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('log_date')) {
      await connection.query('ALTER TABLE time_log ADD COLUMN log_date DATE AFTER job_card_id');
      console.log('✓ Added log_date column');
      
      // Update existing logs with their creation date as log_date
      await connection.query('UPDATE time_log SET log_date = DATE(created_at) WHERE log_date IS NULL');
      console.log('✓ Updated existing records with log_date');
    }
    
    console.log('✓ time_log table updated successfully');
    
  } catch (err) {
    console.error('Error updating table:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

updateTimeLogTable();
