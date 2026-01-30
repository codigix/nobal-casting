import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function checkCollations() {
  const db = await createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  });

  const tables = ['workstation', 'production_entry', 'job_card', 'downtime_entry'];
  
  for (const table of tables) {
    console.log(`\nCollations for table: ${table}`);
    const [columns] = await db.query(`
      SELECT COLUMN_NAME, COLLATION_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      AND COLLATION_NAME IS NOT NULL
    `, [process.env.DB_NAME || 'nobalcasting', table]);
    
    console.table(columns);
  }

  await db.end();
}

checkCollations().catch(console.error);
