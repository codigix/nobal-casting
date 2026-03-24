
import mysql from 'mysql2/promise';

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [woCols] = await connection.execute('DESCRIBE work_order');
    console.log('--- work_order ---');
    console.table(woCols.map(c => ({ Field: c.Field, Type: c.Type })));

    const [woiCols] = await connection.execute('DESCRIBE work_order_item');
    console.log('--- work_order_item ---');
    console.table(woiCols.map(c => ({ Field: c.Field, Type: c.Type })));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkSchema();
