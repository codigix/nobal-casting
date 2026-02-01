
import mysql from 'mysql2/promise';
import { MaterialRequestModel } from './src/models/MaterialRequestModel.js';
import { ProductionPlanningModel } from './src/models/ProductionPlanningModel.js';
import StockBalanceModel from './src/models/StockBalanceModel.js';
import StockLedgerModel from './src/models/StockLedgerModel.js';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function testFlow() {
  const db = await mysql.createConnection(dbConfig);
  global.db = db;
  console.log('Connected to database');

  try {
    const itemCode = 'ITEM-K';
    const warehouseId = 1; // From our check
    const qty = 50;

    // 1. Check initial stock
    const initialBalance = await StockBalanceModel.getByItemAndWarehouse(itemCode, warehouseId, db);
    const initialQty = parseFloat(initialBalance?.current_qty || 0);
    console.log(`Initial stock for ${itemCode} in warehouse ${warehouseId}: ${initialQty}`);

    // 2. Create a Production Plan
    const ppModel = new ProductionPlanningModel(db);
    const planId = `TEST-PLAN-${Date.now()}`;
    await db.execute(
      `INSERT INTO production_plan (plan_id, status, plan_date) VALUES (?, ?, ?)`,
      [planId, 'draft', new Date()]
    );
    console.log(`Created Production Plan: ${planId}`);

    // Add raw material to plan
    await db.execute(
      `INSERT INTO production_plan_raw_material (plan_id, item_code, item_name, plan_to_request_qty, material_status) 
       VALUES (?, ?, ?, ?, ?)`,
      [planId, itemCode, 'Test Item K', qty, 'pending']
    );

    // 3. Create MR from Production Plan
    console.log('Creating Material Request from Production Plan...');
    const mrId = await ppModel.createMaterialRequest(planId);
    console.log(`Created MR: ${mrId}`);

    // Verify MR creation
    const mr = await MaterialRequestModel.getById(db, mrId);
    console.log(`MR Status: ${mr.status}, Purpose: ${mr.purpose}`);
    
    // Set source warehouse for the MR since auto-create might not set it
    // Note: warehouse_id 1 is likely 'ACCEPTED' based on previous context, but let's be sure
    const [whRows] = await db.execute('SELECT warehouse_code FROM warehouses WHERE id = ?', [warehouseId]);
    const whCode = whRows[0]?.warehouse_code || 'ACCEPTED';
    await db.execute('UPDATE material_request SET source_warehouse = ? WHERE mr_id = ?', [whCode, mrId]);

    // 4. Approve (Release) the MR
    console.log('Approving (Releasing) Material Request...');
    await MaterialRequestModel.approve(db, mrId, 1);
    console.log('MR Approved');

    // 5. Verify results
    const finalBalance = await StockBalanceModel.getByItemAndWarehouse(itemCode, warehouseId, db);
    const finalQty = parseFloat(finalBalance?.current_qty || 0);
    console.log(`Final stock for ${itemCode}: ${finalQty}`);

    if (initialQty - finalQty === qty) {
      console.log('✓ Stock deduction correct');
    } else {
      console.error(`✗ Stock deduction incorrect. Expected ${qty}, got ${initialQty - finalQty}`);
    }

    const [pprm] = await db.execute(
      'SELECT material_status FROM production_plan_raw_material WHERE plan_id = ? AND item_code = ?',
      [planId, itemCode]
    );
    console.log(`Production Plan Raw Material Status: ${pprm[0].material_status}`);

    if (pprm[0].material_status === 'issued') {
      console.log('✓ Production plan material status updated to issued');
    } else {
      console.error(`✗ Production plan material status incorrect. Expected issued, got ${pprm[0].material_status}`);
    }

    // Cleanup
    console.log('Cleaning up...');
    await db.execute('DELETE FROM stock_ledger WHERE reference_name = ?', [mrId]);
    await db.execute('UPDATE stock_balance SET current_qty = ?, available_qty = ? WHERE item_code = ? AND warehouse_id = ?', 
      [initialQty, initialQty, itemCode, warehouseId]);
    await db.execute('DELETE FROM material_request_item WHERE mr_id = ?', [mrId]);
    await db.execute('DELETE FROM material_request WHERE mr_id = ?', [mrId]);
    await db.execute('DELETE FROM production_plan_raw_material WHERE plan_id = ?', [planId]);
    await db.execute('DELETE FROM production_plan WHERE plan_id = ?', [planId]);
    console.log('Cleanup complete');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await db.end();
  }
}

testFlow();
