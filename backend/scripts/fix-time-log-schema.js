import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function fixSchemas() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // 1. Fix time_log table
    console.log('Checking time_log table schema...');
    const [tlColumns] = await connection.query('SHOW COLUMNS FROM time_log');
    const existingTLColumns = tlColumns.map(c => c.Field);

    const missingTLColumns = [
      { name: 'day_number', type: 'INT DEFAULT 1' },
      { name: 'log_date', type: 'DATE' },
      { name: 'workstation_name', type: 'VARCHAR(255)' },
      { name: 'from_period', type: 'VARCHAR(5)' },
      { name: 'to_period', type: 'VARCHAR(5)' },
      { name: 'start_time', type: 'TIME' },
      { name: 'end_time', type: 'TIME' },
      { name: 'downtime_minutes', type: 'INT DEFAULT 0' },
      { name: 'produced_qty', type: 'DECIMAL(18,6) DEFAULT 0' },
      { name: 'inhouse', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'outsource', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const col of missingTLColumns) {
      if (!existingTLColumns.includes(col.name)) {
        console.log(`Adding column ${col.name} to time_log...`);
        await connection.query(`ALTER TABLE time_log ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    // 2. Fix rejection_entry table
    console.log('Checking rejection_entry table schema...');
    const [reColumns] = await connection.query('SHOW COLUMNS FROM rejection_entry');
    const existingREColumns = reColumns.map(c => c.Field);

    if (!existingREColumns.includes('status')) {
      console.log('Adding column status to rejection_entry...');
      await connection.query("ALTER TABLE rejection_entry ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'");
    }

    // 3. Fix downtime_entry table
    console.log('Checking downtime_entry table schema...');
    const [dtColumns] = await connection.query('SHOW COLUMNS FROM downtime_entry');
    const existingDTColumns = dtColumns.map(c => c.Field);

    const missingDTColumns = [
      { name: 'day_number', type: 'INT DEFAULT 1' },
      { name: 'log_date', type: 'DATE' },
      { name: 'shift', type: 'VARCHAR(20)' },
      { name: 'from_period', type: 'VARCHAR(5)' },
      { name: 'to_period', type: 'VARCHAR(5)' }
    ];

    for (const col of missingDTColumns) {
      if (!existingDTColumns.includes(col.name)) {
        console.log(`Adding column ${col.name} to downtime_entry...`);
        await connection.query(`ALTER TABLE downtime_entry ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    console.log('All schemas fixed successfully!');
  } catch (err) {
    console.error('Error fixing schemas:', err.message);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

fixSchemas();
