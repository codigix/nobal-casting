import mysql from 'mysql2/promise';
import ProductionModel from '../src/models/ProductionModel.js';
import dotenv from 'dotenv';
dotenv.config();

async function testMachineAvailability() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  };

  const connection = await mysql.createConnection(dbConfig);
  const db = {
    query: (sql, params) => connection.query(sql, params),
    execute: (sql, params) => connection.execute(sql, params)
  };

  const model = new ProductionModel(db);

  try {
    console.log('--- Testing Machine Availability Logic ---');

    // 1. Setup test data
    const date = '2024-05-20';
    const machineId = 'MACH-TEST-001';
    const jc1 = 'JC-TEST-001';
    const jc2 = 'JC-TEST-002';

    // Ensure machine exists in machine_master
    await connection.execute('INSERT IGNORE INTO machine_master (machine_id, name, type) VALUES (?, ?, ?)', [machineId, 'Test Machine 1', 'CNC']);
    await connection.execute('INSERT IGNORE INTO workstation (name, workstation_name, status, is_active) VALUES (?, ?, ?, 1)', ['Test Machine 1', 'Test Machine 1', 'active']);

    // Clean up previous test entries
    await connection.execute('DELETE FROM production_entry WHERE machine_id = ? AND entry_date = ?', [machineId, date]);
    await connection.execute('DELETE FROM time_log WHERE workstation_name = ? AND log_date = ?', [machineId, date]);

    console.log('\nSCENARIO 1: No entries yet');
    await model._checkMachineAvailability(machineId, date, '1', jc1);
    console.log('✓ OK: No conflicts found (as expected)');

    console.log('\nSCENARIO 2: Machine occupied by JC1 in production_entry');
    // Bypassing createProductionEntry to avoid FK issues
    await connection.execute(
      `INSERT INTO production_entry (entry_id, work_order_id, job_card_id, machine_id, entry_date, shift_no)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['ENTRY-TEST-001', 'WO-IGNORE', jc1, machineId, date, 1]
    );

    try {
      await model._checkMachineAvailability(machineId, date, '1', jc1);
      console.log('✓ OK: Same job card allowed');
    } catch (err) {
      console.error('✗ Error: Same job card blocked unexpectedly:', err.message);
    }

    try {
      await model._checkMachineAvailability(machineId, date, '1', jc2);
      console.error('✗ Error: Different job card NOT blocked');
    } catch (err) {
      console.log(`✓ OK: Different job card blocked: ${err.message}`);
    }

    console.log('\nSCENARIO 3: Machine occupied by JC1 in time_log');
    await connection.execute('DELETE FROM production_entry WHERE entry_id = ?', ['ENTRY-TEST-001']);
    await connection.execute(
      `INSERT INTO time_log (time_log_id, job_card_id, log_date, workstation_name, shift)
       VALUES (?, ?, ?, ?, ?)`,
      ['TL-TEST-001', jc1, date, machineId, 'A']
    );

    try {
      await model._checkMachineAvailability(machineId, date, '1', jc1);
      console.log('✓ OK: Same job card allowed (Time Log)');
    } catch (err) {
      console.error('✗ Error: Same job card blocked unexpectedly (Time Log):', err.message);
    }

    try {
      await model._checkMachineAvailability(machineId, date, '1', jc2);
      console.error('✗ Error: Different job card NOT blocked (Time Log)');
    } catch (err) {
      console.log(`✓ OK: Different job card blocked (Time Log): ${err.message}`);
    }

    console.log('\nSCENARIO 4: Cross-table conflict (Entry exists, checking Log)');
    await connection.execute(
      `INSERT INTO production_entry (entry_id, work_order_id, job_card_id, machine_id, entry_date, shift_no)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['ENTRY-TEST-002', jc1, jc1, machineId, date, 1]
    );
    await connection.execute('DELETE FROM time_log WHERE time_log_id = ?', ['TL-TEST-001']);

    try {
      await model._checkMachineAvailability(machineId, date, '1', jc2);
      console.error('✗ Error: Cross-table conflict NOT detected');
    } catch (err) {
      console.log(`✓ OK: Cross-table conflict detected: ${err.message}`);
    }

    console.log('\nSCENARIO 5: getWorkstations availability flag');
    const workstations = await model.getWorkstations({ date, shift: '1' });
    const testWs = workstations.find(ws => ws.name === 'Test Machine 1');
    if (testWs) {
      console.log(`Workstation: ${testWs.name}, Available: ${testWs.is_available}, Occupied By: ${testWs.occupied_by}`);
      if (testWs.is_available === false && testWs.occupied_by === jc1) {
        console.log('✓ OK: getWorkstations correctly identifies occupant');
      } else {
        console.error('✗ Error: getWorkstations flag/occupant incorrect');
      }
    } else {
      console.error('✗ Error: Test workstation not found in getWorkstations');
    }

    // Clean up
    await connection.execute('DELETE FROM production_entry WHERE entry_id = ?', ['ENTRY-TEST-002']);
    console.log('\n--- Test Completed Successfully ---');

  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await connection.end();
  }
}

testMachineAvailability();
