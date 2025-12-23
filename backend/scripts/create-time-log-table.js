const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createTimeLogTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Creating time_log table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS time_log (
        time_log_id VARCHAR(50) PRIMARY KEY,
        job_card_id VARCHAR(50) NOT NULL,
        employee_id VARCHAR(50),
        operator_name VARCHAR(255),
        shift VARCHAR(10),
        from_time TIME,
        to_time TIME,
        time_in_minutes INT,
        completed_qty DECIMAL(18,6) DEFAULT 0,
        accepted_qty DECIMAL(18,6) DEFAULT 0,
        rejected_qty DECIMAL(18,6) DEFAULT 0,
        scrap_qty DECIMAL(18,6) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (job_card_id) REFERENCES job_card(job_card_id) ON DELETE CASCADE,
        INDEX idx_job_card (job_card_id),
        INDEX idx_employee (employee_id),
        INDEX idx_created_at (created_at)
      )
    `);
    
    console.log('✓ time_log table created successfully');
    
  } catch (err) {
    console.error('Error creating table:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

createTimeLogTable();
