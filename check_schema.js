
import mysql from 'mysql2/promise';

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    const [cols] = await connection.execute('SHOW COLUMNS FROM job_card');
    console.log('job_card columns:');
    const columnNames = cols.map(c => c.Field);
    console.log(columnNames.join(', '));
    
    const missing = ['execution_mode', 'subcontract_status', 'sent_qty', 'received_qty', 'accepted_qty', 'rejected_qty'];
    console.log('\nChecking for critical columns:');
    missing.forEach(m => {
        console.log(`${m}: ${columnNames.includes(m) ? 'PRESENT' : 'MISSING'}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkSchema();
