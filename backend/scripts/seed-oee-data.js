import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function seedOEEData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting',
    port: 3306
  });

  try {
    console.log('🗑️ Clearing existing OEE-related data...');
    await connection.execute('DELETE FROM downtime_entry');
    await connection.execute('DELETE FROM production_entry');
    await connection.execute('DELETE FROM job_card');
    await connection.execute('DELETE FROM workstation');
    await connection.execute('DELETE FROM production_machines');
    await connection.execute('DELETE FROM machine_master');

    const machines = [
      { id: 'M-001', name: 'CNC Lathe 1', type: 'CNC', location: 'Section A' },
      { id: 'M-002', name: 'Milling Machine 1', type: 'Milling', location: 'Section A' },
      { id: 'M-003', name: 'Drilling Machine 1', type: 'Drilling', location: 'Section B' },
      { id: 'M-004', name: 'Grinding Machine 1', type: 'Grinding', location: 'Section B' },
      { id: 'M-005', name: 'Welding Robot 1', type: 'Welding', location: 'Section C' }
    ];

    console.log('🏗️ Seeding machines...');
    for (const machine of machines) {
      // Seed machine_master (Primary source for some FKs)
      await connection.execute(
        `INSERT INTO machine_master (machine_id, name, status) 
         VALUES (?, ?, ?)`,
        [machine.id, machine.name, 'active']
      );

      // Seed workstation
      await connection.execute(
        `INSERT INTO workstation (name, workstation_name, location, capacity_per_hour, status, workstation_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [machine.id, machine.name, machine.location, 50, 'active', machine.type]
      );

      // Seed production_machines (for UI sync)
      await connection.execute(
        `INSERT INTO production_machines (machine_id, name, type, status, capacity, performance, workload) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [machine.id, machine.name, machine.type, 'Operational', 100, 85, 70]
      );
    }

    console.log('🔍 Fetching valid Work Orders...');
    const [woRows] = await connection.query('SELECT wo_id FROM work_order LIMIT 10');
    if (woRows.length === 0) {
      throw new Error('No work orders found in database. Please seed work orders first.');
    }
    const validWOIds = woRows.map(row => row.wo_id);
    console.log(`✅ Found ${validWOIds.length} valid Work Orders.`);

    const today = new Date();

    console.log('📋 Seeding Job Cards and Production Entries...');
    for (let i = 0; i < 14; i++) { // Last 14 days
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      for (const machine of machines) {
        const woId = validWOIds[Math.floor(Math.random() * validWOIds.length)];
        const jcId = `JC-${machine.id}-${dateStr}`;

        // Create Job Card
        await connection.execute(
          `INSERT INTO job_card (job_card_id, work_order_id, machine_id, operation, status, operation_time) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [jcId, woId, machine.id, 'Production', 'completed', 5] // 5 mins ideal cycle time
        );

        // Create Production Entry
        const produced = 80 + Math.floor(Math.random() * 40);
        const rejected = Math.floor(Math.random() * 5);
        await connection.execute(
          `INSERT INTO production_entry (entry_id, work_order_id, machine_id, entry_date, shift_no, quantity_produced, quantity_rejected, hours_worked) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [`PE-${machine.id}-${dateStr}`, woId, machine.id, dateStr, 1, produced, rejected, 7.5]
        );

        // Add some downtime for some days
        if (Math.random() > 0.7) {
          const duration = 30 + Math.floor(Math.random() * 60);
          const dtId = `DT-${machine.id}-${dateStr}`;
          await connection.execute(
            `INSERT INTO downtime_entry (downtime_id, job_card_id, downtime_reason, duration_minutes) 
             VALUES (?, ?, ?, ?)`,
            [dtId, jcId, 'Tooling Issue', duration]
          );
        }
      }
    }

    console.log('✅ Seeding completed successfully!');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await connection.end();
  }
}

seedOEEData();
