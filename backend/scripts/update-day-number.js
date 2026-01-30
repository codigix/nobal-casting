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

async function updateDayNumber() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Adding day_number column to time_log and rejection_entry...');
    
    // Update time_log
    const [tlColumns] = await connection.query('SHOW COLUMNS FROM time_log');
    if (!tlColumns.map(c => c.Field).includes('day_number')) {
      await connection.query('ALTER TABLE time_log ADD COLUMN day_number INT AFTER job_card_id');
      console.log('✓ Added day_number column to time_log');
    }
    
    // Update rejection_entry
    const [reColumns] = await connection.query('SHOW COLUMNS FROM rejection_entry');
    if (!reColumns.map(c => c.Field).includes('day_number')) {
      await connection.query('ALTER TABLE rejection_entry ADD COLUMN day_number INT AFTER job_card_id');
      console.log('✓ Added day_number column to rejection_entry');
    }
    
    console.log('✓ Tables updated successfully');
    
  } catch (err) {
    console.error('Error updating tables:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

updateDayNumber();
