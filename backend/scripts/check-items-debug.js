
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkItems() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  try {
    const [rows] = await connection.execute('SELECT item_code, name, item_group, is_active FROM item LIMIT 20');
    console.log(JSON.stringify(rows, null, 2));
    
    const [groups] = await connection.execute('SELECT DISTINCT item_group FROM item');
    console.log('Available Item Groups:', groups);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkItems();
