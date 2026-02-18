import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import ProductionModel from './src/models/ProductionModel.js';
dotenv.config();

async function test() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: 3307
  });

  const model = new ProductionModel(db);
  const testJCId = 'TEST-JC-SYNC-' + Date.now();
  const testWOId = 'TEST-WO-SYNC-' + Date.now();
  const validItemCode = '-MSSHEET5MM';

  try {
    console.log('--- STARTING SYNC TEST ---');

    // 1. Setup Mock Data
    await db.query('INSERT INTO work_order (wo_id, item_code, quantity, status) VALUES (?, ?, ?, ?)', 
        [testWOId, validItemCode, 100, 'In Progress']);
    
    // Set planned_quantity to 100 to allow testing
    await db.query('INSERT INTO job_card (job_card_id, work_order_id, operation, operation_sequence, status, produced_quantity, accepted_quantity, planned_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [testJCId, testWOId, 'Test Operation', 1, 'In Progress', 0, 0, 100]);

    console.log('Setup Mock Data: Success');

    // 2. Add Time Log
    const timeLogData = {
        job_card_id: testJCId,
        completed_qty: 50,
        accepted_qty: 45,
        rejected_qty: 3,
        scrap_qty: 2,
        shift: 'A',
        log_date: '2026-02-18',
        time_in_minutes: 480,
        inhouse: true
    };
    
    const timeLog = await model.createTimeLog(timeLogData);
    console.log('Added Time Log:', timeLog.time_log_id);

    // 3. Verify Job Card and Production Entry
    const [jcAfterAdd] = await db.query('SELECT produced_quantity, accepted_quantity, rejected_quantity, scrap_quantity FROM job_card WHERE job_card_id = ?', [testJCId]);
    console.log('JC Quantities After Add:', jcAfterAdd[0]);

    const [peAfterAdd] = await db.query('SELECT * FROM production_entry WHERE job_card_id = ?', [testJCId]);
    console.log('Production Entries After Add:', peAfterAdd.length);
    if (peAfterAdd.length > 0) {
        console.log('PE Qty Produced:', peAfterAdd[0].quantity_produced);
    }

    if (parseFloat(jcAfterAdd[0].produced_quantity) !== 50) {
        throw new Error(`Expected produced_quantity 50, got ${jcAfterAdd[0].produced_quantity}`);
    }

    // 4. Delete Time Log
    console.log('Deleting Time Log...');
    await model.deleteTimeLog(timeLog.time_log_id);

    // 5. Verify Job Card and Production Entry (Sync should have cleared them)
    const [jcAfterDel] = await db.query('SELECT produced_quantity, accepted_quantity, rejected_quantity, scrap_quantity FROM job_card WHERE job_card_id = ?', [testJCId]);
    console.log('JC Quantities After Delete:', jcAfterDel[0]);

    const [peAfterDel] = await db.query('SELECT * FROM production_entry WHERE job_card_id = ?', [testJCId]);
    console.log('Production Entries After Delete:', peAfterDel.length);

    if (parseFloat(jcAfterDel[0].produced_quantity) !== 0) {
        throw new Error(`Expected produced_quantity 0, got ${jcAfterDel[0].produced_quantity}`);
    }
    
    if (peAfterDel.length !== 0) {
        throw new Error(`Expected 0 production entries, got ${peAfterDel.length}`);
    }

    console.log('--- SYNC TEST COMPLETED SUCCESSFULLY ---');

  } catch (err) {
    console.error('TEST FAILED:', err);
  } finally {
    // Cleanup
    await db.query('DELETE FROM time_log WHERE job_card_id = ?', [testJCId]);
    await db.query('DELETE FROM production_entry WHERE job_card_id = ?', [testJCId]);
    await db.query('DELETE FROM job_card WHERE job_card_id = ?', [testJCId]);
    await db.query('DELETE FROM work_order WHERE wo_id = ?', [testWOId]);
    await db.end();
  }
}

test();
