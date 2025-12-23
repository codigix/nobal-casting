import mysql from 'mysql2/promise';

async function seedMachines() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });

    console.log('🔄 Seeding production machines...\n');

    const machinesData = [
      {
        machine_id: 'M-001',
        name: 'CNC Lathe 1',
        type: 'CNC Lathe',
        status: 'Operational',
        capacity: 100,
        workload: 85,
        allocation: 90,
        performance: 87,
        errors: 0,
        total_operating_hours: 8432,
        maintenance_cycles: 24,
        uptime_percentage: 99.2
      },
      {
        machine_id: 'M-002',
        name: 'Milling Machine A',
        type: 'Milling Machine',
        status: 'Operational',
        capacity: 100,
        workload: 72,
        allocation: 75,
        performance: 74,
        errors: 2,
        total_operating_hours: 7654,
        maintenance_cycles: 22,
        uptime_percentage: 98.8
      },
      {
        machine_id: 'M-003',
        name: 'Stamping Press',
        type: 'Stamping Press',
        status: 'Operational',
        capacity: 100,
        workload: 95,
        allocation: 100,
        performance: 96,
        errors: 0,
        total_operating_hours: 9123,
        maintenance_cycles: 26,
        uptime_percentage: 99.5
      },
      {
        machine_id: 'M-004',
        name: 'Assembly Robot',
        type: 'Robotic Arm',
        status: 'Maintenance',
        capacity: 100,
        workload: 0,
        allocation: 20,
        performance: 15,
        errors: 1,
        total_operating_hours: 6234,
        maintenance_cycles: 18,
        uptime_percentage: 97.5
      },
      {
        machine_id: 'M-005',
        name: 'Polishing Unit',
        type: 'Polishing Machine',
        status: 'Operational',
        capacity: 100,
        workload: 88,
        allocation: 85,
        performance: 89,
        errors: 1,
        total_operating_hours: 8876,
        maintenance_cycles: 25,
        uptime_percentage: 99.0
      },
      {
        machine_id: 'M-006',
        name: 'Packaging Machine',
        type: 'Packaging Machine',
        status: 'Down',
        capacity: 100,
        workload: 0,
        allocation: 0,
        performance: 10,
        errors: 3,
        total_operating_hours: 5432,
        maintenance_cycles: 15,
        uptime_percentage: 96.2
      },
      {
        machine_id: 'M-007',
        name: 'CNC Lathe 2',
        type: 'CNC Lathe',
        status: 'Operational',
        capacity: 100,
        workload: 78,
        allocation: 82,
        performance: 80,
        errors: 1,
        total_operating_hours: 7890,
        maintenance_cycles: 21,
        uptime_percentage: 98.5
      },
      {
        machine_id: 'M-008',
        name: 'Milling Machine B',
        type: 'Milling Machine',
        status: 'Operational',
        capacity: 100,
        workload: 65,
        allocation: 70,
        performance: 68,
        errors: 0,
        total_operating_hours: 6543,
        maintenance_cycles: 19,
        uptime_percentage: 99.1
      },
      {
        machine_id: 'M-009',
        name: 'Drilling Machine',
        type: 'Drilling Machine',
        status: 'Operational',
        capacity: 100,
        workload: 82,
        allocation: 88,
        performance: 85,
        errors: 2,
        total_operating_hours: 8234,
        maintenance_cycles: 23,
        uptime_percentage: 98.9
      },
      {
        machine_id: 'M-010',
        name: 'Quality Testing Unit',
        type: 'Testing Machine',
        status: 'Operational',
        capacity: 100,
        workload: 45,
        allocation: 50,
        performance: 92,
        errors: 0,
        total_operating_hours: 4567,
        maintenance_cycles: 12,
        uptime_percentage: 99.8
      }
    ];

    // Clear existing machines (optional)
    await connection.execute('DELETE FROM production_machines WHERE deleted_at IS NULL');
    console.log('✓ Cleared existing machines\n');

    // Insert new machines
    for (const machine of machinesData) {
      const query = `
        INSERT INTO production_machines 
        (machine_id, name, type, status, capacity, workload, allocation, performance, errors, 
         last_maintenance, total_operating_hours, maintenance_cycles, uptime_percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 300) DAY), ?, ?, ?)
      `;

      await connection.execute(query, [
        machine.machine_id,
        machine.name,
        machine.type,
        machine.status,
        machine.capacity,
        machine.workload,
        machine.allocation,
        machine.performance,
        machine.errors,
        machine.total_operating_hours,
        machine.maintenance_cycles,
        machine.uptime_percentage
      ]);

      console.log(`✓ Added: ${machine.name} (${machine.machine_id})`);
    }

    console.log('\n📊 Fetching summary...\n');

    // Fetch summary
    const [totalCount] = await connection.execute(
      'SELECT COUNT(*) as total FROM production_machines WHERE deleted_at IS NULL'
    );
    console.log(`✓ Total machines: ${totalCount[0].total}`);

    const [statusCounts] = await connection.execute(
      'SELECT status, COUNT(*) as count FROM production_machines WHERE deleted_at IS NULL GROUP BY status'
    );
    console.log('\n📈 Status Distribution:');
    statusCounts.forEach(row => {
      console.log(`  • ${row.status}: ${row.count}`);
    });

    const [avgMetrics] = await connection.execute(
      'SELECT ROUND(AVG(performance), 2) as avgPerformance, ROUND(AVG(workload), 2) as avgWorkload FROM production_machines WHERE deleted_at IS NULL'
    );
    console.log('\n📊 Average Metrics:');
    console.log(`  • Performance: ${avgMetrics[0].avgPerformance}%`);
    console.log(`  • Workload: ${avgMetrics[0].avgWorkload}%`);

    console.log('\n✅ Machine seeding completed successfully!');

    await connection.end();
  } catch (error) {
    console.error('❌ Error seeding machines:', error.message);
    process.exit(1);
  }
}

seedMachines();
