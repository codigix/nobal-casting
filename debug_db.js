import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT)
  });

  try {
    const [ws] = await db.query('SELECT COUNT(*) as count FROM workstation');
    const [pe] = await db.query('SELECT COUNT(*) as count FROM production_entry');
    const [wsSample] = await db.query('SELECT * FROM workstation LIMIT 5');
    
    console.log({ 
      workstations: ws[0].count, 
      production_entries: pe[0].count,
      sample: wsSample
    });
  } catch (err) {
    console.error(err);
  } finally {
    await db.end();
  }
}

check();
