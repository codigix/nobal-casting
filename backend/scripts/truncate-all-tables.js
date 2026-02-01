import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const tables = [
  'account_ledger',
  'address',
  'attendance_log',
  'audit_log',
  'batch_tracking',
  'bom',
  'bom_line',
  'bom_material_request_link',
  'bom_operation',
  'bom_raw_material',
  'bom_scrap',
  'capa_action',
  'company',
  'contact',
  'costing_report',
  'customer',
  'customer_complaint',
  'customer_group',
  'customer_payment',
  'customer_scorecard',
  'delivery_challan',
  'designation_master',
  'die_register',
  'die_rework_log',
  'dispatch_item',
  'dispatch_order',
  'document_sequences',
  'downtime_entry',
  'employee_master',
  'expense_master',
  'grn_request_items',
  'grn_request_logs',
  'grn_requests',
  'inspection_checklist',
  'inspection_result',
  'inward_challan',
  'item',
  'item_barcode',
  'item_customer_detail',
  'item_dimension_parameter',
  'item_group',
  'item_supplier',
  'items',
  'job_card',
  'job_card_material_consumption',
  'machine_master',
  'maintenance_history',
  'maintenance_schedule',
  'manual_review_queue',
  'material_allocation',
  'material_deduction_log',
  'material_request',
  'material_request_item',
  'material_transfer_items',
  'material_transfers',
  'migration_audit_log',
  'notification',
  'operation',
  'operation_execution_log',
  'operation_sub_operation',
  'operator_master',
  'outward_challan',
  'payment_reminder',
  'payroll',
  'period_closing',
  'permission_matrix',
  'production_entry',
  'production_machines',
  'production_plan',
  'production_plan_fg',
  'production_plan_item',
  'production_plan_operations',
  'production_plan_raw_material',
  'production_plan_sub_assembly',
  'production_planning_header',
  'production_rejection',
  'production_stages',
  'purchase_invoice',
  'purchase_invoice_item',
  'purchase_order',
  'purchase_order_item',
  'purchase_receipt',
  'purchase_receipt_item',
  'rejection',
  'rejection_entry',
  'rejection_reason',
  'reorder_items',
  'reorder_management',
  'rfq',
  'rfq_item',
  'rfq_supplier',
  'role_master',
  'sales_order',
  'selling_customer',
  'selling_delivery_note',
  'selling_invoice',
  'selling_quotation',
  'selling_sales_order',
  'shift_allocation',
  'shipment_tracking',
  'stock',
  'stock_balance',
  'stock_entries',
  'stock_entry_items',
  'stock_ledger',
  'stock_movements',
  'stock_reconciliation',
  'stock_reconciliation_items',
  'supplier',
  'supplier_group',
  'supplier_quotation',
  'supplier_quotation_item',
  'system_settings',
  'tax_item',
  'taxes_and_charges_template',
  'time_log',
  'tool_master',
  'uom',
  'users',
  'vendor_payment',
  'warehouse',
  'warehouses',
  'work_order',
  'work_order_item',
  'work_order_operation',
  'workstation',
  'workstation_analysis',
  'workstation_daily_metrics',
  'workstation_monthly_metrics'
];

async function truncateAllTables() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Starting truncation of ALL database tables...');
    
    // Disable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('✓ Foreign key checks disabled');
    
    // Truncate each table
    for (const table of tables) {
      try {
        await connection.execute(`TRUNCATE TABLE \`${table}\``);
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
    
    console.log('\n✓ All database tables truncated successfully!');
  } catch (error) {
    console.error('CRITICAL ERROR:', error.message);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

truncateAllTables();
