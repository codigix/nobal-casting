import mysql from 'mysql2/promise';

async function checkMachines() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [workstations] = await connection.query('SELECT * FROM workstation LIMIT 5');
    console.log('Workstations:', JSON.stringify(workstations, null, 2));

    const [peCount] = await connection.query('SELECT COUNT(*) as count FROM production_entry');
    console.log('Production Entry Count:', peCount[0].count);

    const [deCount] = await connection.query('SELECT COUNT(*) as count FROM downtime_entry');
    console.log('Downtime Entry Count:', deCount[0].count);

    const [jcCount] = await connection.query('SELECT COUNT(*) as count FROM job_card');
    console.log('Job Card Count:', jcCount[0].count);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkMachines();
