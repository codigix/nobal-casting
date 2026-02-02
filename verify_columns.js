import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './backend/.env' });

async function check() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting',
    port: 3306
  });

  try {
    const tables = ['operation', 'job_card', 'work_order_operation', 'bom_operation'];
    for (const table of tables) {
      console.log(`\nColumns for ${table}:`);
      const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
      columns.forEach(c => {
        console.log(`    ${c.Field}: ${c.Type}`);
      });
      if (columns.some(c => c.Field === 'hourly_rate')) {
        console.log(`  >>> FOUND hourly_rate in ${table}`);
      } else {
        console.log(`  !!! hourly_rate NOT FOUND in ${table}`);
      }
    }
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await db.end();
  }
}

check();
