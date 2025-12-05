import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'aluminium_erp',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function updateEnum() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database');
    
    await connection.query(
      `ALTER TABLE grn_requests MODIFY status ENUM('pending', 'inspecting', 'awaiting_inventory_approval', 'approved', 'rejected', 'sent_back') DEFAULT 'pending'`
    );
    
    console.log('Successfully updated grn_requests status ENUM');
    connection.release();
    await pool.end();
  } catch (error) {
    console.error('Error updating ENUM:', error.message);
    process.exit(1);
  }
}

updateEnum();
