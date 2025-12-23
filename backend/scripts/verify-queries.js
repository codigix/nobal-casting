
import mysql from 'mysql2/promise';

async function verifyQueries() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });

    console.log('1. Testing Total Count...');
    const [[{ total }]] = await connection.query(
      `SELECT COUNT(*) as total FROM production_machines WHERE deleted_at IS NULL`
    );
    console.log('Total:', total);

    console.log('\n2. Testing Status Counts...');
    const [statusCounts] = await connection.query(
      `SELECT status, COUNT(*) as count FROM production_machines WHERE deleted_at IS NULL GROUP BY status`
    );
    console.log('Status Counts:', statusCounts);

    console.log('\n3. Testing All Machines List...');
    const [allMachines] = await connection.query(
      `SELECT 
        machine_id as id,
        name,
        type,
        status,
        capacity,
        workload,
        allocation,
        performance,
        errors,
        last_maintenance as lastMaintenance,
        total_operating_hours as totalOperatingHours,
        maintenance_cycles as maintenanceCycles,
        uptime_percentage as uptimePercentage,
        created_at as createdAt
       FROM production_machines
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`
    );
    console.log('Machines fetched:', allMachines.length);

    console.log('\n4. Testing Machine Utilization...');
    const [machineUtilization] = await connection.query(
      `SELECT 
        name as machine,
        workload as utilization,
        capacity
       FROM production_machines
       WHERE deleted_at IS NULL
       ORDER BY workload DESC`
    );
    console.log('Utilization rows:', machineUtilization.length);

    console.log('\n5. Testing Machine Efficiency (Complex GROUP BY)...');
    try {
        const [machineEfficiency] = await connection.query(
          `SELECT 
            DATE_FORMAT(created_at, '%b %Y') as month,
            ROUND(AVG(performance), 2) as efficiency
           FROM production_machines
           WHERE deleted_at IS NULL
           GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
           ORDER BY DATE_FORMAT(created_at, '%Y-%m') DESC
           LIMIT 6`
        );
        console.log('Efficiency rows:', machineEfficiency);
    } catch (err) {
        console.error('ERROR in Efficiency Query:', err.message);
    }

    console.log('\n6. Testing Avg Performance...');
    const [averagePerformance] = await connection.query(
      `SELECT ROUND(AVG(performance), 2) as avgPerformance FROM production_machines WHERE deleted_at IS NULL`
    );
    console.log('Avg Performance:', averagePerformance[0].avgPerformance);

    console.log('\n7. Testing Avg Utilization...');
    const [averageUtilization] = await connection.query(
      `SELECT ROUND(AVG(workload), 2) as avgUtilization FROM production_machines WHERE deleted_at IS NULL`
    );
    console.log('Avg Utilization:', averageUtilization[0].avgUtilization);

    await connection.end();
  } catch (error) {
    console.error('Global Error:', error);
  }
}

verifyQueries();
