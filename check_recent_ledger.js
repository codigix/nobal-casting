import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'proot',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    const [rows] = await connection.query("SELECT * FROM stock_ledger ORDER BY id DESC LIMIT 10");
    console.log('Last 10 Stock Ledger Entries:');
    console.table(rows.map(r => ({
      id: r.id,
      item: r.item_code,
      type: r.transaction_type,
      qty_in: r.qty_in,
      qty_out: r.qty_out,
      ref: r.reference_name
    })));
  } catch (error) {
    console.error('Check failed:', error.message);
  } finally {
    await connection.end();
  }
}

check();
