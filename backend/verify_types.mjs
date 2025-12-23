import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
  port: 3306
});

async function verify() {
  try {
    const [summary] = await pool.query(`
      SELECT workstation_type, COUNT(*) as count 
      FROM workstation 
      GROUP BY workstation_type 
      ORDER BY workstation_type
    `);
    
    console.log('Workstation Type Summary:');
    let total = 0;
    summary.forEach(row => {
      const type = row.workstation_type || '(unassigned)';
      console.log(`  ${type}: ${row.count}`);
      total += row.count;
    });
    console.log(`\nTotal: ${total}`);
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

verify();
