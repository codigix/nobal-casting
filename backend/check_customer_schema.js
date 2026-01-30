
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

  console.log('--- TABLES ---');
  const [tables] = await connection.query('SHOW TABLES');
  console.log(tables);

  const customerTable = tables.some(t => Object.values(t)[0] === 'selling_customer') ? 'selling_customer' : 'customer';
  console.log(`Using customer table: ${customerTable}`);

  console.log(`--- ${customerTable} columns ---`);
  const [columns] = await connection.query(`DESCRIBE ${customerTable}`);
  console.log(columns);

  console.log('--- Sales Order columns ---');
  const [soColumns] = await connection.query('DESCRIBE selling_sales_order');
  console.log(soColumns);

  await connection.end();
}

checkSchema().catch(console.error);
