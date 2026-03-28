const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

async function addColumnIfNotExists(connection, table, column, definition) {
  try {
    const [rows] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
    if (rows.length === 0) {
      console.log(`Adding column ${column} to table ${table}...`);
      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`✓ Added ${column} to ${table}`);
    } else {
      // console.log(`Column ${column} already exists in ${table}`);
    }
  } catch (err) {
    console.error(`Error adding column ${column} to ${table}:`, err.message);
  }
}

async function modifyColumn(connection, table, column, definition) {
  try {
    console.log(`Modifying column ${column} in table ${table}...`);
    await connection.query(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${definition}`);
    console.log(`✓ Modified ${column} in ${table}`);
  } catch (err) {
    console.error(`Error modifying column ${column} in ${table}:`, err.message);
  }
}

async function runMigration() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('Running Manufacturing V2 migration (safe mode)...');

    // 1. bom_operation
    await addColumnIfNotExists(connection, 'bom_operation', 'setup_time', 'DECIMAL(10,2) DEFAULT 0');
    await addColumnIfNotExists(connection, 'bom_operation', 'cycle_time', 'DECIMAL(10,2) DEFAULT 0');

    // 2. work_order_operation
    await addColumnIfNotExists(connection, 'work_order_operation', 'setup_time', 'DECIMAL(10,2) DEFAULT 0');
    await addColumnIfNotExists(connection, 'work_order_operation', 'cycle_time', 'DECIMAL(10,2) DEFAULT 0');

    // 3. job_card
    await addColumnIfNotExists(connection, 'job_card', 'setup_time', 'DECIMAL(10,2) DEFAULT 0');
    await addColumnIfNotExists(connection, 'job_card', 'cycle_time', 'DECIMAL(10,2) DEFAULT 0');
    await addColumnIfNotExists(connection, 'job_card', 'workstation_id', 'VARCHAR(100)');
    await addColumnIfNotExists(connection, 'job_card', 'operator_id', 'VARCHAR(100)');
    await modifyColumn(connection, 'job_card', 'execution_mode', "ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE'");
    await addColumnIfNotExists(connection, 'job_card', 'vendor_id', 'VARCHAR(50)');
    await addColumnIfNotExists(connection, 'job_card', 'send_date', 'DATE');
    await addColumnIfNotExists(connection, 'job_card', 'expected_return_date', 'DATE');
    await addColumnIfNotExists(connection, 'job_card', 'vendor_rate_per_unit', 'DECIMAL(18,2) DEFAULT 0');
    await addColumnIfNotExists(connection, 'job_card', 'subcontract_status', "ENUM('DRAFT', 'SENT', 'RECEIVED', 'COMPLETED') DEFAULT 'DRAFT'");
    await addColumnIfNotExists(connection, 'job_card', 'actual_start_date', 'DATETIME');
    await addColumnIfNotExists(connection, 'job_card', 'actual_end_date', 'DATETIME');
    await modifyColumn(connection, 'job_card', 'status', "VARCHAR(50) DEFAULT 'DRAFT'");

    // 4. time_log
    await addColumnIfNotExists(connection, 'time_log', 'downtime_minutes', 'INT DEFAULT 0');
    await addColumnIfNotExists(connection, 'time_log', 'produced_qty', 'DECIMAL(18,6) DEFAULT 0');
    await addColumnIfNotExists(connection, 'time_log', 'start_time', 'TIME');
    await addColumnIfNotExists(connection, 'time_log', 'end_time', 'TIME');

    // 5. work_order
    await addColumnIfNotExists(connection, 'work_order', 'total_produced_qty', 'DECIMAL(18,6) DEFAULT 0');
    await addColumnIfNotExists(connection, 'work_order', 'total_accepted_qty', 'DECIMAL(18,6) DEFAULT 0');
    await addColumnIfNotExists(connection, 'work_order', 'total_rejected_qty', 'DECIMAL(18,6) DEFAULT 0');
    await addColumnIfNotExists(connection, 'work_order', 'progress', 'DECIMAL(5,2) DEFAULT 0');

    // 6. inward_challan
    await addColumnIfNotExists(connection, 'inward_challan', 'processed_qty', 'DECIMAL(18,6) DEFAULT 0');

    console.log('✓ Migration finished successfully');
    
  } catch (err) {
    console.error('Error during migration:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

runMigration();
