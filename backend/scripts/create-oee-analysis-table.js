import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3307,
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function createOEEAnalysisTable() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to database');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS oee_analysis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level ENUM('job_card', 'work_order', 'workstation') NOT NULL,
        reference_id VARCHAR(50) NOT NULL,
        log_date DATE NOT NULL,
        shift VARCHAR(20) NOT NULL,
        availability DECIMAL(5,2) DEFAULT 0,
        performance DECIMAL(5,2) DEFAULT 0,
        quality DECIMAL(5,2) DEFAULT 0,
        oee DECIMAL(5,2) DEFAULT 0,
        planned_production_time INT DEFAULT 0,
        downtime INT DEFAULT 0,
        actual_run_time INT DEFAULT 0,
        ideal_cycle_time DECIMAL(10,4) DEFAULT 0,
        total_produced_qty DECIMAL(18,6) DEFAULT 0,
        accepted_qty DECIMAL(18,6) DEFAULT 0,
        availability_loss INT DEFAULT 0,
        performance_loss INT DEFAULT 0,
        quality_loss_qty DECIMAL(18,6) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_oee_level_ref_date_shift (level, reference_id, log_date, shift)
      )
    `);

    console.log('✓ oee_analysis table created successfully');

    // Add indexes for performance
    try {
      await connection.execute('CREATE INDEX idx_oee_level_date ON oee_analysis(level, log_date)');
      await connection.execute('CREATE INDEX idx_oee_ref_id ON oee_analysis(reference_id)');
      console.log('✓ Indexes created successfully');
    } catch (indexErr) {
      if (indexErr.code === 'ER_DUP_KEYNAME') {
        console.log('- Indexes already exist');
      } else {
        throw indexErr;
      }
    }
  } catch (err) {
    console.error('Error creating table:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createOEEAnalysisTable();
