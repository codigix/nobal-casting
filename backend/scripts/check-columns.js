import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    console.log('--- work_order_operation ---');
    const [wooColumns] = await connection.execute('SHOW COLUMNS FROM work_order_operation');
    wooColumns.forEach(c => console.log(`${c.Field}: ${c.Type}`));

    console.log('\n--- job_card ---');
    const [jcColumns] = await connection.execute('SHOW COLUMNS FROM job_card');
    jcColumns.forEach(c => console.log(`${c.Field}: ${c.Type}`));

    console.log('\n--- bom_operation ---');
    const [bomOpColumns] = await connection.execute('SHOW COLUMNS FROM bom_operation');
    bomOpColumns.forEach(c => console.log(`${c.Field}: ${c.Type}`));

    console.log('\n--- production_plan_operations ---');
    const [ppoColumns] = await connection.execute('SHOW COLUMNS FROM production_plan_operations');
    ppoColumns.forEach(c => console.log(`${c.Field}: ${c.Type}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

check();
