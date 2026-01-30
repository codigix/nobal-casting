import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306,
});

async function checkSchemas() {
  const tables = ['job_card', 'work_order_operation', 'time_log', 'rejection_entry'];
  
  for (const table of tables) {
    console.log(`\n--- Schema for ${table} ---`);
    const [columns] = await db.query(`DESCRIBE ${table}`);
    columns.forEach(c => console.log(`  ${c.Field}: ${c.Type}`));
  }
  process.exit(0);
}

checkSchemas();
