
import mysql from 'mysql2/promise';

async function getSchema() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const tables = ['job_card', 'production_entry', 'outward_challan', 'inward_challan'];
    for (const table of tables) {
      console.log(`\n--- Schema for ${table} ---`);
      const [schema] = await connection.query(`DESCRIBE ${table}`);
      console.table(schema);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

getSchema();
