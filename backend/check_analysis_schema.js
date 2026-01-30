
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'erp_user',
    password: process.env.DB_PASSWORD || 'erp_password',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  const tables = ['selling_sales_order', 'work_order', 'job_card', 'production_entry', 'material_request', 'material_request_item'];
  
  for (const table of tables) {
    try {
      console.log(`\n--- Schema for ${table} ---`);
      const [columns] = await connection.query(`DESCRIBE ${table}`);
      console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));
    } catch (err) {
      console.log(`Error describing ${table}: ${err.message}`);
    }
  }

  await connection.end();
}

checkSchema();
