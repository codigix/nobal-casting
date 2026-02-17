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
    const tables = ['production_plan_raw_material', 'production_plan_sub_assembly', 'production_plan_fg', 'production_plan'];
    for (const table of tables) {
      console.log(`\nTable: ${table}`);
      const [cols] = await conn.query(`DESCRIBE ${table}`);
      console.table(cols);
    }

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
