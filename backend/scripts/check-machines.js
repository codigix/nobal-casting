
import mysql from 'mysql2/promise';

async function checkMachines() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });

    const [rows] = await connection.query('SELECT COUNT(*) as count FROM production_machines');
    console.log(`Machine count: ${rows[0].count}`);
    
    if (rows[0].count > 0) {
        const [machines] = await connection.query('SELECT * FROM production_machines LIMIT 1');
        console.log('Sample machine:', machines[0]);
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMachines();
