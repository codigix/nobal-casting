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

async function updateRejectionEntryTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Updating rejection_entry table...');
    
    // Check if columns exist
    const [columns] = await connection.query('SHOW COLUMNS FROM rejection_entry');
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('log_date')) {
      await connection.query('ALTER TABLE rejection_entry ADD COLUMN log_date DATE AFTER job_card_id');
      console.log('✓ Added log_date column to rejection_entry');
      
      // Update existing entries with their creation date as log_date
      await connection.query('UPDATE rejection_entry SET log_date = DATE(created_at) WHERE log_date IS NULL');
      console.log('✓ Updated existing records with log_date');
    }
    
    console.log('✓ rejection_entry table updated successfully');
    
  } catch (err) {
    console.error('Error updating table:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

updateRejectionEntryTable();
