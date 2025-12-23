import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function test() {
  try {
    // Total records in workstations
    const [totalWs] = await pool.query(
      `SELECT COUNT(*) as count FROM workstation WHERE is_active = 1`
    );
    console.log(`Total active workstations: ${totalWs[0].count}`);
    
    // Total records in daily_metrics
    const [totalDm] = await pool.query(
      `SELECT COUNT(*) as count FROM workstation_daily_metrics`
    );
    console.log(`Total daily_metrics records: ${totalDm[0].count}`);
    
    // Total unique workstations in daily_metrics
    const [uniqueDm] = await pool.query(
      `SELECT COUNT(DISTINCT workstation_id) as count FROM workstation_daily_metrics`
    );
    console.log(`Unique workstations in daily_metrics: ${uniqueDm[0].count}`);
    
    // Get the workstation IDs that have daily metrics
    console.log('\nWorkstation IDs with daily metrics:');
    const [wsIds] = await pool.query(
      `SELECT DISTINCT workstation_id FROM workstation_daily_metrics ORDER BY workstation_id`
    );
    console.log(wsIds.map(w => w.workstation_id).join(', '));
    
    // Check a specific workstation from the actual workstation table
    const [firstWs] = await pool.query(`SELECT id, name FROM workstation LIMIT 1`);
    const wsId = firstWs[0].id;
    console.log(`\nChecking workstation ${wsId} (${firstWs[0].name}):`);
    
    const [metricsCount] = await pool.query(
      `SELECT COUNT(*) as count FROM workstation_daily_metrics WHERE workstation_id = ?`,
      [wsId]
    );
    console.log(`  Daily metrics records: ${metricsCount[0].count}`);
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

test();
