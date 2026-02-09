
import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log('Adding status column to rejection_entry...');
    await connection.query('ALTER TABLE rejection_entry ADD COLUMN status VARCHAR(50) DEFAULT "Pending"');
    console.log('Done.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

run();
