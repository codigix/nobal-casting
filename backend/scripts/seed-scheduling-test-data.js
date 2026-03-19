
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import ProductionModel from '../src/models/ProductionModel.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function seedTestData() {
  const pool = mysql.createPool(dbConfig);
  const productionModel = new ProductionModel(pool);

  try {
    const [dbInfo] = await pool.query('SELECT DATABASE() as db, USER() as user');
    console.log(`Connected to: ${dbInfo[0].db} as ${dbInfo[0].user}`);

    console.log('--- 0. Cleaning up existing production data ---');
    const [cols] = await pool.query('SHOW COLUMNS FROM workstation');
    console.log('Workstation columns:', cols.map(c => c.Field));

    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('DELETE FROM production_entry');
    await pool.query('DELETE FROM job_card');
    await pool.query('DELETE FROM work_order_dependency');
    await pool.query('DELETE FROM work_order_item');
    await pool.query('DELETE FROM work_order');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ Production tables cleared');

    console.log('\n--- 1. Setting up Workstations ---');
    await pool.query('DELETE FROM workstation WHERE name IN (?, ?, ?)', ['CNC-01', 'ASSEMBLY-01', 'DRILL-01']);
    
    const insertWorkstation = async (name, fullName, cap) => {
      await pool.query(
        'INSERT INTO workstation (name, workstation_name, parallel_capacity) VALUES (?, ?, ?)', 
        [name, fullName, cap]
      );
    };
    
    await insertWorkstation('CNC-01', 'CNC Machine 01', 1);
    await insertWorkstation('ASSEMBLY-01', 'Assembly Station 01', 2);
    await insertWorkstation('DRILL-01', 'Drilling Machine 01', 1);
    console.log('✓ Workstations set up');

    const op1 = 'EMP-001';
    const op2 = 'EMP-002';
    const op3 = 'EMP-003';
    const op4 = 'EMP-004';
    const op5 = 'EMP-005';

    console.log('\n--- 2. Creating Test Work Orders ---');
    const woId = `WO-TEST-MAIN`;
    await productionModel.createWorkOrder({
      wo_id: woId,
      item_code: 'TEST-ITEM',
      quantity: 100,
      status: 'Draft',
      planned_start_date: new Date(),
      planned_end_date: new Date(Date.now() + 86400000)
    });
    console.log(`✓ Main Work Order created: ${woId}`);

    const woSeqId = `WO-SEQ-MAIN`;
    await productionModel.createWorkOrder({
      wo_id: woSeqId,
      item_code: 'SEQ-ITEM',
      quantity: 10,
      status: 'Draft'
    });
    console.log(`✓ Sequential Work Order created: ${woSeqId}`);

    const today = new Date().toISOString().split('T')[0];

    console.log('\n--- 3. Testing Allocation for CNC-01 (Capacity: 1) ---');
    
    // Job 1: 10:00 - 12:00 (Should PASS)
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-CNC-1`,
        work_order_id: woId,
        machine_id: 'CNC-01',
        operator_id: op1,
        operation: 'Milling',
        operation_sequence: 1,
        scheduled_start_date: `${today} 10:00:00`,
        scheduled_end_date: `${today} 12:00:00`,
        planned_quantity: 50,
        status: 'ready'
      });
      console.log('✓ JC-CNC-1 (10:00-12:00) created successfully');
    } catch (err) { console.error('✗ JC-CNC-1 failed:', err.message); }

    // Job 2: 11:00 - 13:00 (Should FAIL due to Machine overlap)
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-CNC-2`,
        work_order_id: woId,
        machine_id: 'CNC-01',
        operator_id: op2,
        operation: 'Milling',
        operation_sequence: 1.5,
        scheduled_start_date: `${today} 11:00:00`,
        scheduled_end_date: `${today} 13:00:00`,
        planned_quantity: 50,
        status: 'ready'
      });
      console.log('✗ JC-CNC-2 created unexpectedly');
    } catch (err) { console.log('✓ JC-CNC-2 (11:00-13:00) REJECTED as expected:', err.message); }

    console.log('\n--- 4. Testing Allocation for ASSEMBLY-01 (Capacity: 2) ---');

    // Job 3: 10:00 - 12:00 (Should PASS)
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-ASS-1`,
        work_order_id: woId,
        machine_id: 'ASSEMBLY-01',
        operator_id: op2,
        operation: 'Assembly',
        operation_sequence: 1,
        scheduled_start_date: `${today} 10:00:00`,
        scheduled_end_date: `${today} 12:00:00`,
        planned_quantity: 50,
        status: 'ready'
      });
      console.log('✓ JC-ASS-1 (10:00-12:00) created successfully');
    } catch (err) { console.error('✗ JC-ASS-1 failed:', err.message); }

    // Job 4: 11:00 - 13:00 (Should PASS - 2nd slot in capacity)
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-ASS-2`,
        work_order_id: woId,
        machine_id: 'ASSEMBLY-01',
        operator_id: op3,
        operation: 'Assembly',
        operation_sequence: 1.1,
        scheduled_start_date: `${today} 11:00:00`,
        scheduled_end_date: `${today} 13:00:00`,
        planned_quantity: 50,
        status: 'ready'
      });
      console.log('✓ JC-ASS-2 (11:00-13:00) created successfully');
    } catch (err) { console.error('✗ JC-ASS-2 failed:', err.message); }

    // Job 5: 11:30 - 14:00 (Should FAIL - Capacity 2 exceeded)
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-ASS-3`,
        work_order_id: woId,
        machine_id: 'ASSEMBLY-01',
        operator_id: op4,
        operation: 'Assembly',
        operation_sequence: 1.2,
        scheduled_start_date: `${today} 11:30:00`,
        scheduled_end_date: `${today} 14:00:00`,
        planned_quantity: 50,
        status: 'ready'
      });
      console.log('✗ JC-ASS-3 created unexpectedly');
    } catch (err) { console.log('✓ JC-ASS-3 (11:30-14:00) REJECTED as expected:', err.message); }

    console.log('\n--- 5. Testing Operator Conflict ---');
    // op1 is busy 10:00-12:00 on JC-CNC-1
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-OP-CONFLICT`,
        work_order_id: woId,
        machine_id: 'DRILL-01',
        operator_id: op1, 
        operation: 'Drilling',
        operation_sequence: 5,
        scheduled_start_date: `${today} 11:00:00`,
        scheduled_end_date: `${today} 12:00:00`,
        planned_quantity: 50,
        status: 'ready'
      });
      console.log('✗ JC-OP-CONFLICT created unexpectedly');
    } catch (err) { console.log('✓ JC-OP-CONFLICT REJECTED as expected:', err.message); }

    console.log('\n--- 6. Testing Sequential Dependency ---');
    
    // Op 1: Seq 1, 09:00 - 10:00 (PASS)
    await productionModel.createJobCard({
      job_card_id: `JC-SEQ-1`,
      work_order_id: woSeqId,
      machine_id: 'DRILL-01',
      operator_id: op5,
      operation: 'Seq 1',
      operation_sequence: 1,
      scheduled_start_date: `${today} 09:00:00`,
      scheduled_end_date: `${today} 10:00:00`,
      planned_quantity: 10,
      status: 'ready'
    });
    console.log('✓ JC-SEQ-1 created (09:00-10:00)');

    // Op 2: Seq 2, 09:30 - 10:30 (Should FAIL - Starts before Seq 1 ends)
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-SEQ-2-FAIL`,
        work_order_id: woSeqId,
        machine_id: 'CNC-01',
        operator_id: op4,
        operation: 'Seq 2',
        operation_sequence: 2,
        scheduled_start_date: `${today} 09:30:00`,
        scheduled_end_date: `${today} 10:30:00`,
        planned_quantity: 10,
        status: 'ready'
      });
      console.log('✗ JC-SEQ-2-FAIL created unexpectedly');
    } catch (err) { console.log('✓ JC-SEQ-2-FAIL REJECTED as expected:', err.message); }

    // Op 2: Seq 2, 10:00 - 11:00 (Should PASS - Starts exactly when Seq 1 ends)
    try {
      await productionModel.createJobCard({
        job_card_id: `JC-SEQ-2-PASS`,
        work_order_id: woSeqId,
        machine_id: 'DRILL-01',
        operator_id: op4,
        operation: 'Seq 2',
        operation_sequence: 2,
        scheduled_start_date: `${today} 10:00:00`,
        scheduled_end_date: `${today} 11:00:00`,
        planned_quantity: 10,
        status: 'ready'
      });
      console.log('✓ JC-SEQ-2-PASS created successfully (10:00-11:00)');
    } catch (err) { console.error('✗ JC-SEQ-2-PASS failed:', err.message); }

    console.log('\n--- Seeding Complete ---');

  } catch (error) {
    console.error('Fatal Error during seeding:', error);
  } finally {
    await pool.end();
  }
}

seedTestData();
