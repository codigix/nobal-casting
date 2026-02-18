import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function query() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const [rows] = await connection.execute(`
        SELECT COUNT(*) as count, 
               SUM(CASE WHEN remarks LIKE '%Auto-synced%' THEN 1 ELSE 0 END) as auto_count,
               SUM(CASE WHEN remarks NOT LIKE '%Auto-synced%' OR remarks IS NULL THEN 1 ELSE 0 END) as manual_count
        FROM production_entry
    `);
    console.log('Production Entry Stats:', rows[0]);
    
    if (rows[0].manual_count > 0) {
        const [samples] = await connection.execute(`
            SELECT entry_id, remarks, quantity_produced 
            FROM production_entry 
            WHERE remarks NOT LIKE '%Auto-synced%' OR remarks IS NULL 
            LIMIT 5
        `);
        console.log('Manual Samples:', samples);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

query();
