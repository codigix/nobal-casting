
const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const tables = ['operation', 'bom_operation', 'work_order_operation', 'job_card', 'warehouses'];
    for (const table of tables) {
      console.log(`--- Schema for ${table} ---`);
      const [rows] = await connection.execute(`DESCRIBE ${table}`);
      console.log(JSON.stringify(rows, null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}
checkSchema();
