import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function fixCollations() {
  const db = await createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  });

  console.log('Altering workstation table collation...');
  
  // Convert the table and all its character columns to utf8mb4_0900_ai_ci
  await db.query(`
    ALTER TABLE workstation 
    CONVERT TO CHARACTER SET utf8mb4 
    COLLATE utf8mb4_0900_ai_ci
  `);

  console.log('Collation fix applied successfully.');

  await db.end();
}

fixCollations().catch(console.error);
