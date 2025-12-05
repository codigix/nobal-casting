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

async function checkGRN() {
  try {
    const connection = await pool.getConnection();
    
    const [rows] = await connection.query(
      `SELECT id, grn_no, po_no, status FROM grn_requests ORDER BY created_at DESC LIMIT 5`
    );
    
    console.log('\n=== Latest GRN Requests ===');
    console.table(rows);
    
    const [awaitingInventory] = await connection.query(
      `SELECT COUNT(*) as count FROM grn_requests WHERE status = 'awaiting_inventory_approval'`
    );
    
    console.log(`\nTotal GRNs awaiting inventory approval: ${awaitingInventory[0].count}`);
    
    connection.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkGRN();
