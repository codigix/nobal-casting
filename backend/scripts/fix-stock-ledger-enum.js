import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'proot',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Adding "WIP Movement" to stock_ledger.transaction_type ENUM...');
    
    // Get existing enum values to be safe, but we already know them from DESCRIBE
    // We'll just update it to include 'WIP Movement'
    const alterQuery = `
      ALTER TABLE stock_ledger 
      MODIFY COLUMN transaction_type ENUM(
        'Purchase Receipt','Issue','Transfer','Manufacturing Return','Repack',
        'Scrap Entry','Reconciliation','Adjustment','Consumption','Production',
        'Rejection','Scrap','Manufacturing Issue','Production Receipt','Other',
        'IN','OUT','Receipt','Opening','Return','WIP Movement'
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
