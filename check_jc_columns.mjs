
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function checkColumns() {
  const connection = await mysql.createConnection({
    port: process.env.DB_PORT || 3307,
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    const [rows] = await connection.execute('DESC job_card');
    console.log('Columns in job_card:');
    console.table(rows);
    
    const [opRows] = await connection.execute('DESC operation');
    console.log('\nColumns in operation:');
    console.table(opRows);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkColumns();
