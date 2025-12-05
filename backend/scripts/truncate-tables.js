import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const tables = [
  'accounts_ledger',
  'accounts_journal_entry',
  'accounts_finance',
  'address',
  'batch_tracking',
  'company',
  'contact',
  'customer',
  'department',
  'dispatch_history',
  'dispatch_item',
  'dispatch',
  'employee',
  'grn_inspection',
  'grn_request',
  'hr_attendance',
  'hr_leave',
  'hr_salary',
  'item',
  'material_request_item',
  'material_request',
  'material_transfer_item',
  'material_transfer',
  'production_batch',
  'production_item',
  'production_order_item',
  'production_order',
  'purchase_invoice_item',
  'purchase_invoice',
  'purchase_order_item',
  'purchase_order',
  'purchase_receipt_item',
  'purchase_receipt',
  'qc_result',
  'qc_check',
  'reorder_management',
  'rfq_supplier',
  'rfq',
  'sales_order_item',
  'sales_order',
  'stock_balance',
  'stock_entry_item',
  'stock_entry',
  'stock_ledger',
  'stock_reconciliation_item',
  'stock_reconciliation',
  'stock_warehouse',
  'supplier_item',
  'supplier_quotation',
  'supplier_group',
  'supplier',
  'tool_room_item',
  'tool_room',
  'user',
  'warehouse',
];

async function truncateTables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Starting table truncation...');
    
    // Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Foreign key checks disabled');
    
    // Truncate each table
    for (const table of tables) {
      try {
        await connection.execute(`TRUNCATE TABLE ${table}`);
        console.log(`✓ Truncated ${table}`);
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log(`- Skipped ${table} (table does not exist)`);
        } else {
          console.error(`✗ Error truncating ${table}:`, error.message);
        }
      }
    }
    
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Foreign key checks re-enabled');
    
    console.log('\n✓ All tables truncated successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

truncateTables();
