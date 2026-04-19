import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Updating stock_ledger.transaction_type ENUM to include Dispatch and Subcontract types...');
    
    const alterQuery = `
      ALTER TABLE stock_ledger 
      MODIFY COLUMN transaction_type ENUM(
        'Purchase Receipt', 'Issue', 'Transfer', 'Manufacturing Return', 'Repack',
        'Scrap Entry', 'Reconciliation', 'Adjustment', 'Consumption', 'Production',
        'Rejection', 'Scrap', 'Manufacturing Issue', 'Production Receipt', 'Other',
        'IN', 'OUT', 'Receipt', 'Opening', 'Return', 'WIP Movement',
        'Dispatch', 'Subcontract Dispatch', 'Subcontract Receipt', 'Subcontract Rejection', 'Material Issue'
      ) NOT NULL
    `;
    
    await connection.query(alterQuery);
    console.log('Successfully updated stock_ledger schema.');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
