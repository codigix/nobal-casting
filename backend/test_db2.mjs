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
    // Check workstations
    const [ws] = await pool.query(`SELECT id, name FROM workstation LIMIT 5`);
    console.log('Sample workstations:');
    ws.forEach(w => console.log(`  ID: ${w.id}, Name: ${w.name}`));
    
    // Check workstation_analysis
    const [wa] = await pool.query(`SELECT workstation_id, workstation_name FROM workstation_analysis LIMIT 5`);
    console.log('\nSample workstation_analysis records:');
    wa.forEach(w => console.log(`  Workstation ID: ${w.workstation_id}, Name: ${w.workstation_name}`));
    
    // Check daily metrics for first workstation
    const [ws1] = await pool.query(`SELECT id FROM workstation LIMIT 1`);
    if (ws1.length > 0) {
      const ws1Id = ws1[0].id;
      console.log(`\nChecking daily metrics for workstation_id=${ws1Id}:`);
      const [daily] = await pool.query(
        `SELECT COUNT(*) as count FROM workstation_daily_metrics WHERE workstation_id = ?`,
        [ws1Id]
      );
      console.log(`  Records: ${daily[0].count}`);
      
      const [sample] = await pool.query(
        `SELECT * FROM workstation_daily_metrics WHERE workstation_id = ? LIMIT 1`,
        [ws1Id]
      );
      if (sample.length > 0) {
        console.log('  Sample:', sample[0]);
      }
    }
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

test();
