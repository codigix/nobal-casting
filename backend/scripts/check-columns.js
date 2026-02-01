
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT) || 3307
};

async function checkColumns() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const tables = ['stock_reconciliation', 'stock_reconciliation_items', 'item', 'items'];
    for (const table of tables) {
      try {
        const [columns] = await connection.query(`DESCRIBE ${table}`);
        console.log(`Columns in ${table}:`);
        columns.forEach(col => console.log(`- ${col.Field}`));
      } catch (e) {
        console.log(`Table ${table} not found or error: ${e.message}`);
      }
      console.log('---');
    }
  } catch (error) {
    console.error('Failed to describe tables:', error);
  } finally {
    await connection.end();
  }
}

checkColumns();
