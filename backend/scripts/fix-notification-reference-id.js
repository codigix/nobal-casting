
import mysql from 'mysql2/promise';

async function migrate() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log('Altering notification table: changing reference_id from INT to VARCHAR(100)...');
    await connection.execute('ALTER TABLE notification MODIFY COLUMN reference_id VARCHAR(100)');
    console.log('✓ Successfully altered notification table.');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await connection.end();
  }
}

migrate();
