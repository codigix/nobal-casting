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

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Starting migration: Adding period columns to production logs...');

    // 1. Update time_log table
    console.log('Updating time_log table...');
    const [timeLogCols] = await connection.query('SHOW COLUMNS FROM time_log');
    const hasFromPeriodTL = timeLogCols.some(c => c.Field === 'from_period');
    
    if (!hasFromPeriodTL) {
      await connection.query('ALTER TABLE time_log ADD COLUMN from_period VARCHAR(5) AFTER from_time');
      await connection.query('ALTER TABLE time_log ADD COLUMN to_period VARCHAR(5) AFTER to_time');
      console.log('✓ Added period columns to time_log');
    } else {
      console.log('- time_log already has period columns');
    }

    // 2. Update downtime_entry table
    console.log('Updating downtime_entry table...');
    const [downtimeCols] = await connection.query('SHOW COLUMNS FROM downtime_entry');
    const hasFromPeriodDT = downtimeCols.some(c => c.Field === 'from_period');
    
    if (!hasFromPeriodDT) {
      await connection.query('ALTER TABLE downtime_entry ADD COLUMN from_period VARCHAR(5) AFTER from_time');
      await connection.query('ALTER TABLE downtime_entry ADD COLUMN to_period VARCHAR(5) AFTER to_time');
      console.log('✓ Added period columns to downtime_entry');
    } else {
      console.log('- downtime_entry already has period columns');
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

migrate();
