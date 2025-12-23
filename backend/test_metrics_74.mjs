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
    const wsId = 74;
    
    // Query exactly as the controller does
    const [dailyMetrics] = await pool.query(
      `SELECT 
        metric_date as date,
        allocation_time,
        downtime,
        jobs_completed,
        performance_percentage,
        efficiency_percentage,
        rejection_rate
       FROM workstation_daily_metrics
       WHERE workstation_id = ?
       ORDER BY metric_date DESC
       LIMIT 30`,
      [wsId]
    );
    
    console.log(`Daily metrics for workstation ${wsId}:`);
    console.log(`Count: ${dailyMetrics.length}`);
    console.log('Sample:', dailyMetrics[0]);
    
    // Check what the reversed array would look like
    console.log('\nAfter reverse:');
    console.log(`Count: ${dailyMetrics.reverse().length}`);
    console.log('First:', dailyMetrics[0]);
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

test();
