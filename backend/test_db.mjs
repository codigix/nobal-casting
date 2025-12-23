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
    const [tables] = await pool.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'nobal_casting' 
      AND TABLE_NAME IN ('workstation_daily_metrics', 'workstation_monthly_metrics', 'workstation_analysis')
    `);
    
    console.log('Tables found:', tables.map(t => t.TABLE_NAME));
    
    for (const table of ['workstation_daily_metrics', 'workstation_monthly_metrics', 'workstation_analysis']) {
      const [result] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${result[0].count} records`);
    }
    
    const [sample] = await pool.query(`SELECT * FROM workstation_daily_metrics LIMIT 1`);
    console.log('Sample:', sample[0]);
    
  } catch(err) {
    console.error('Error:', err.message);
  }
  
  await pool.end();
}

test();
