import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  });

  try {
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables in database:');
    rows.forEach(row => console.log(Object.values(row)[0]));

    const [itemsCols] = await connection.query('SHOW TABLES LIKE "items"');
    if (itemsCols.length > 0) {
        console.log('\n"items" table exists.');
        const [cols] = await connection.query('DESCRIBE items');
        console.log('Columns in items:');
        console.table(cols);
    }

    const [itemCols] = await connection.query('SHOW TABLES LIKE "item"');
    if (itemCols.length > 0) {
        console.log('\n"item" table exists.');
        const [cols] = await connection.query('DESCRIBE item');
        console.log('Columns in item:');
        console.table(cols);
    }

  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await connection.end();
  }
}

checkTables();
