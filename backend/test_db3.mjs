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
    // Check daily metrics for workstation 27 (BUFFING)
    console.log('Checking daily metrics for workstation 27:');
    const [daily27] = await pool.query(
      `SELECT COUNT(*) as count FROM workstation_daily_metrics WHERE workstation_id = 27`
    );
    console.log(`  Records: ${daily27[0].count}`);
    
    // Check workstations in daily_metrics
    console.log('\nUnique workstations in daily_metrics:');
    const [uniqueWs] = await pool.query(
      `SELECT DISTINCT workstation_id FROM workstation_daily_metrics ORDER BY workstation_id LIMIT 10`
    );
    uniqueWs.forEach(w => console.log(`  ${w.workstation_id}`));
    
    // Check how many records for each workstation_id in daily_metrics
    console.log('\nRecord count per workstation:');
    const [counts] = await pool.query(
      `SELECT workstation_id, COUNT(*) as count FROM workstation_daily_metrics GROUP BY workstation_id LIMIT 10`
    );
    counts.forEach(c => console.log(`  Workstation ${c.workstation_id}: ${c.count} records`));
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

test();
