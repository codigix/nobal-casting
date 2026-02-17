
import mysql from 'mysql2/promise';

async function checkSchema() {
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [cols] = await db.execute('DESCRIBE production_plan_sub_assembly');
    console.log('production_plan_sub_assembly:', cols);
    
    const [fgCols] = await db.execute('DESCRIBE production_plan_fg');
    console.log('production_plan_fg:', fgCols);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

checkSchema();
