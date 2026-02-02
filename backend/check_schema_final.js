import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function checkSchema() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [cols] = await conn.query('DESCRIBE production_plan_raw_material');
    console.log('production_plan_raw_material columns:');
    console.table(cols);

    const [triggers] = await conn.query('SHOW TRIGGERS');
    console.log('\nTriggers:');
    console.table(triggers);
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

checkSchema();
