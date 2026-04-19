import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  });

  try {
    const [rows] = await connection.query("SHOW CREATE TABLE stock_ledger");
    console.log('--- TABLE DEFINITION ---');
    console.log(rows[0]['Create Table']);
    
    const [cols] = await connection.query("DESC stock_ledger");
    console.log('\n--- COLUMN DETAILS ---');
    console.table(cols);
    
  } catch (error) {
    console.error('Check failed:', error.message);
  } finally {
    await connection.end();
  }
}

checkSchema();
