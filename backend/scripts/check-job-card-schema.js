
import mysql from 'mysql2/promise';

async function checkJobCardSchema() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [cols] = await connection.execute('DESCRIBE job_card');
    console.log('--- job_card ---');
    console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkJobCardSchema();
