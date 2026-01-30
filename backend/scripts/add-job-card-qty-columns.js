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

async function updateJobCardTable() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    console.log('Updating job_card table...');
    
    const [columns] = await connection.query('SHOW COLUMNS FROM job_card');
    const columnNames = columns.map(c => c.Field);
    
    if (!columnNames.includes('accepted_quantity')) {
      await connection.query('ALTER TABLE job_card ADD COLUMN accepted_quantity DECIMAL(18,6) DEFAULT 0 AFTER rejected_quantity');
      console.log('✓ Added accepted_quantity column');
    }
    
    if (!columnNames.includes('scrap_quantity')) {
      await connection.query('ALTER TABLE job_card ADD COLUMN scrap_quantity DECIMAL(18,6) DEFAULT 0 AFTER accepted_quantity');
      console.log('✓ Added scrap_quantity column');
    }
    
    console.log('✓ job_card table updated successfully');
    
  } catch (err) {
    console.error('Error updating table:', err.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
    await pool.end();
  }
}

updateJobCardTable();
