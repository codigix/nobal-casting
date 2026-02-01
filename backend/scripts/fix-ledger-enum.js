import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'proot',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    console.log('Expanding transaction_type ENUM in stock_ledger...');
    
    // Check current column definition
    const [rows] = await connection.query("SHOW COLUMNS FROM stock_ledger LIKE 'transaction_type'");
    if (rows.length > 0) {
        console.log('Current Type:', rows[0].Type);
    }

    const alterQuery = `
      ALTER TABLE stock_ledger 
      MODIFY COLUMN transaction_type ENUM(
        'Purchase Receipt', 
        'Issue', 
        'Transfer', 
        'Manufacturing Return', 
        'Repack', 
        'Scrap Entry', 
        'Reconciliation', 
        'Adjustment', 
        'IN', 
        'OUT',
        'Receipt',
        'Other',
        'Opening'
      ) NOT NULL
    `;
    
    await connection.query(alterQuery);
    console.log('Migration successful: transaction_type ENUM expanded.');
    
    // Also check if warehouses table has 'id' vs 'warehouse_code' as PK and used as FK in ledger
    // The ledger schema showed warehouse_id as INT.
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
