import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Adding received_qty to purchase_order_item...');
    
    // Check if column exists first to be safe
    const [columns] = await connection.execute('SHOW COLUMNS FROM purchase_order_item LIKE "received_qty"');
    
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE purchase_order_item ADD COLUMN received_qty DECIMAL(18,6) DEFAULT 0 AFTER qty');
      console.log('✓ Added received_qty column');
    } else {
      console.log('⚠ received_qty column already exists');
    }

    console.log('Migration completed!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

migrate();
