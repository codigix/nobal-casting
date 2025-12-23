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

async function createDowntimeEntryTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Creating downtime_entry table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS downtime_entry (
        downtime_id VARCHAR(50) PRIMARY KEY,
        job_card_id VARCHAR(50) NOT NULL,
        downtime_type VARCHAR(255),
        downtime_reason VARCHAR(255),
        from_time TIME,
        to_time TIME,
        duration_minutes INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE,
        INDEX idx_job_card (job_card_id),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('✓ downtime_entry table created successfully');
    
  } catch (err) {
    console.error('Error creating table:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

createDowntimeEntryTable();
