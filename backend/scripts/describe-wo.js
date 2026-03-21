import mysql from 'mysql2/promise';

async function describeTable() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [columns] = await connection.execute('DESCRIBE work_order');
    console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

describeTable();
