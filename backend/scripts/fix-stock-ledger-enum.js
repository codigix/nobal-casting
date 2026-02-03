import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function fixStockLedgerEnum() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    console.log('Updating stock_ledger.transaction_type ENUM...');
    
    // Comprehensive list of all transaction types used in the codebase
    const newEnumValues = [
      'Purchase Receipt',
      'Issue',
      'Transfer',
      'Manufacturing Return',
      'Repack',
      'Scrap Entry',
      'Reconciliation',
      'Adjustment',
      'Consumption',
      'Production',
      'Rejection',
      'Scrap',
      'Manufacturing Issue',
      'Production Receipt',
      'Other'
    ];

    const enumString = newEnumValues.map(v => `'${v}'`).join(', ');
    const alterQuery = `ALTER TABLE stock_ledger MODIFY COLUMN transaction_type ENUM(${enumString}) NOT NULL`;

    await connection.query(alterQuery);
    console.log('Successfully updated stock_ledger.transaction_type ENUM.');

    // Also check if stock_entries.entry_type needs updates
    console.log('Checking stock_entries.entry_type...');
    const [entriesCols] = await connection.query('DESCRIBE stock_entries');
    const entryTypeCol = entriesCols.find(c => c.Field === 'entry_type');
    console.log('Current entry_type:', entryTypeCol.Type);

  } catch (error) {
    console.error('Error updating ENUM:', error);
  } finally {
    await connection.end();
  }
}

fixStockLedgerEnum();
