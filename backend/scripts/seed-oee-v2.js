
import mysql from 'mysql2/promise';

async function seedOEE() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting',
    port: 3306
  });

  try {
    console.log('Starting OEE Seeding v2...');

    // 1. Clear existing OEE related data to avoid conflicts
    await connection.execute('DELETE FROM downtime_entry');
    await connection.execute('DELETE FROM production_entry');
    await connection.execute('DELETE FROM job_card');
    await connection.execute('DELETE FROM workstation');
    await connection.execute('DELETE FROM machine_master');

    const machines = [
      { id: 'M-001', name: 'CNC Lathe 1', type: 'CNC', location: 'Line 1' },
      { id: 'M-002', name: 'CNC Lathe 2', type: 'CNC', location: 'Line 1' },
      { id: 'M-003', name: 'VMC Machine 1', type: 'VMC', location: 'Line 2' },
      { id: 'M-004', name: 'VMC Machine 2', type: 'VMC', location: 'Line 2' },
      { id: 'M-005', name: 'Grinding Machine', type: 'Grinding', location: 'Line 3' },
      { id: 'M-006', name: 'Drilling Station', type: 'Drilling', location: 'Line 3' }
    ];

    console.log('Seeding machines...');
    for (const machine of machines) {
      await connection.execute(
        `INSERT INTO machine_master (machine_id, name, status) VALUES (?, ?, ?)`,
        [machine.id, machine.name, 'active']
      );

      await connection.execute(
        `INSERT INTO workstation (name, workstation_name, location, capacity_per_hour, status, workstation_type, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [machine.id, machine.name, machine.location, 60, 'active', machine.type, 1]
      );
    }

    // 2. Ensure we have at least one work order for job cards
    const [woRows] = await connection.query('SELECT wo_id FROM work_order LIMIT 1');
    let woId = woRows.length > 0 ? woRows[0].wo_id : 'WO-SEED-001';
    
    if (woRows.length === 0) {
        await connection.execute(
            `INSERT INTO work_order (wo_id, item_code, quantity, status) VALUES (?, ?, ?, ?)`,
            [woId, 'ITEM-001', 10000, 'In Progress']
        );
    }

    const today = new Date();
    const downtimeReasons = ['Tool Change', 'Breakdown', 'Setup', 'No Material', 'Minor Adjustment'];

    console.log('Seeding 30 days of data...');
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      for (const machine of machines) {
        // Shift 1
        const jcId = `JC-${machine.id}-${dateStr}-S1`;
        const idealCycleTime = 1; // 1 min per unit
        
        await connection.execute(
          `INSERT INTO job_card (job_card_id, work_order_id, machine_id, operation, status, operation_time) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [jcId, woId, machine.id, 'Machining', 'completed', idealCycleTime]
        );

        // OEE Components Logic
        // Availability: Aim for 70-95%
        // Performance: Aim for 70-98%
        // Quality: Aim for 90-99%

        const plannedMins = 480; // 8 hour shift
        const downtimeMins = Math.random() > 0.2 ? Math.floor(Math.random() * 60) + 10 : 0;
        const actualOperatingMins = plannedMins - downtimeMins;
        
        const performanceFactor = 0.7 + (Math.random() * 0.28); // 0.7 to 0.98
        const maxProduced = Math.floor(actualOperatingMins / idealCycleTime);
        const produced = Math.floor(maxProduced * performanceFactor);
        
        const qualityFactor = 0.9 + (Math.random() * 0.09); // 0.9 to 0.99
        const rejected = Math.floor(produced * (1 - qualityFactor));

        await connection.execute(
          `INSERT INTO production_entry (entry_id, work_order_id, machine_id, entry_date, shift_no, quantity_produced, quantity_rejected, hours_worked) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`PE-${machine.id}-${dateStr}-S1`, woId, machine.id, dateStr, 1, produced, rejected, actualOperatingMins / 60]
        );

        if (downtimeMins > 0) {
          await connection.execute(
            `INSERT INTO downtime_entry (downtime_id, job_card_id, downtime_reason, duration_minutes, created_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [`DT-${machine.id}-${dateStr}-S1`, jcId, downtimeReasons[Math.floor(Math.random() * downtimeReasons.length)], downtimeMins, date]
          );
        }
      }
    }

    console.log('OEE Seeding completed!');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await connection.end();
  }
}

seedOEE();
