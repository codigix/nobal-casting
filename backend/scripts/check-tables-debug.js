import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nobalcasting',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    const tables = ['users'];
    for (const table of tables) {
      try {
        const [cols] = await db.query(`DESCRIBE ${table}`);
        console.log(`${table} Schema:`, cols.map(c => c.Field));
      } catch (e) {
        console.error(`${table} Describe Failed:`, e.message);
      }
    }

    await db.end();
  } catch (err) {
    console.error('Connection Error:', err);
  }
}
test();
