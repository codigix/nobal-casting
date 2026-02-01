
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import StockBalanceModel from '../src/models/StockBalanceModel.js';
import StockLedgerModel from '../src/models/StockLedgerModel.js';
import StockReconciliationModel from '../src/models/StockReconciliationModel.js';
import StockMovementModel from '../src/models/StockMovementModel.js';
import InventoryModel from '../src/models/InventoryModel.js';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting'
};

async function runVerification() {
  const connection = await mysql.createConnection(dbConfig);
  global.db = connection;
  console.log('✓ Connected to database');

  try {
    const itemCode = 'ITEM-K';
    const warehouseId = 1;
    const userId = 1;

    console.log('\n--- Testing StockReconciliationModel.approve ---');
    // Create a dummy reconciliation
    const reconNo = 'TEST-SR-' + Date.now();
    const [reconResult] = await connection.query(
      `INSERT INTO stock_reconciliation (reconciliation_no, reconciliation_date, warehouse_id, status, created_by) 
       VALUES (?, NOW(), ?, 'Draft', ?)`,
      [reconNo, warehouseId, userId]
    );
    const reconId = reconResult.insertId;

    await connection.query(
      `INSERT INTO stock_reconciliation_items (reconciliation_id, item_id, system_qty, physical_qty, variance_qty, variance_reason) 
       VALUES (?, (SELECT id FROM item WHERE item_code = ?), 100, 110, 10, 'Test Variance')`,
      [reconId, itemCode]
    );

    const initialBalance = await StockBalanceModel.getByItemAndWarehouse(itemCode, warehouseId, connection);
    const initialQty = Number(initialBalance?.current_qty || 0);
    console.log(`Initial Qty: ${initialQty}`);

    await StockReconciliationModel.approve(reconId, userId);
    console.log('Reconciliation Approved');

    const afterReconBalance = await StockBalanceModel.getByItemAndWarehouse(itemCode, warehouseId, connection);
    const afterReconQty = Number(afterReconBalance?.current_qty || 0);
    console.log(`Qty after Recon: ${afterReconQty}`);

    if (afterReconQty === initialQty + 10) {
      console.log('✓ StockReconciliation stock update correct');
    } else {
      console.error(`✗ StockReconciliation stock update incorrect. Expected ${initialQty + 10}, got ${afterReconQty}`);
    }

    console.log('\n--- Testing InventoryModel.allocateMaterialsForWorkOrder ---');
    const inventoryModel = new InventoryModel(connection);
    const woId = 'TEST-WO-' + Date.now();
    const materials = [{
      item_code: itemCode,
      item_name: 'Test Item K',
      required_qty: 5,
      source_warehouse: warehouseId,
      uom: 'Kg'
    }];

    await inventoryModel.allocateMaterialsForWorkOrder(woId, materials, userId);
    console.log('Materials Allocated');

    const afterAllocBalance = await StockBalanceModel.getByItemAndWarehouse(itemCode, warehouseId, connection);
    console.log(`Reserved Qty: ${afterAllocBalance?.reserved_qty}`);

    if (Number(afterAllocBalance?.reserved_qty) >= 5) {
      console.log('✓ InventoryModel allocation correct');
    } else {
      console.error(`✗ InventoryModel allocation incorrect. Reserved qty should be at least 5`);
    }

    // Cleanup
    console.log('\n--- Cleaning up ---');
    await connection.query('DELETE FROM stock_ledger WHERE reference_name = ?', [reconNo]);
    await connection.query('DELETE FROM stock_reconciliation_items WHERE reconciliation_id = ?', [reconId]);
    await connection.query('DELETE FROM stock_reconciliation WHERE id = ?', [reconId]);
    await connection.query('DELETE FROM material_allocation WHERE work_order_id = ?', [woId]);
    
    // Reset stock balance
    await StockBalanceModel.upsert(itemCode, warehouseId, {
      current_qty: initialQty,
      reserved_qty: Number(initialBalance?.reserved_qty || 0)
    }, connection);
    
    console.log('✓ Cleanup complete');

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await connection.end();
  }
}

runVerification();
