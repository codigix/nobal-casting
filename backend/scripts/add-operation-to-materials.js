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
    password: process.env.DB_PASSWORD || 'proot',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Adding "operation" column to bom_line and work_order_item...');
    
    // Check if column exists in bom_line
    const [bomCols] = await connection.query('SHOW COLUMNS FROM bom_line LIKE "operation"');
    if (bomCols.length === 0) {
      await connection.query('ALTER TABLE bom_line ADD COLUMN operation VARCHAR(255) AFTER component_type');
      console.log('✓ Added operation to bom_line');
    }

    // Check if column exists in work_order_item
    const [woCols] = await connection.query('SHOW COLUMNS FROM work_order_item LIKE "operation"');
    if (woCols.length === 0) {
      await connection.query('ALTER TABLE work_order_item ADD COLUMN operation VARCHAR(255) AFTER sequence');
      console.log('✓ Added operation to work_order_item');
    }

    console.log('Successfully updated schema.');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
