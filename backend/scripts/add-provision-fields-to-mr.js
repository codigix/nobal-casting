import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Adding provisioned_qty column to material_request_item...');
    
    // Check if column exists
    const [columns] = await connection.execute('SHOW COLUMNS FROM material_request_item LIKE "provisioned_qty"');
    
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE material_request_item ADD COLUMN provisioned_qty DECIMAL(15,3) DEFAULT 0 AFTER qty');
      console.log('Column provisioned_qty added successfully.');
    } else {
      console.log('Column provisioned_qty already exists.');
    }

    // Add status 'partially_provisioned' to material_request if it's not there (optional, status is ENUM)
    // Actually ENUMs are hard to update without re-creating. Let's check current ENUM.
    const [mrColumns] = await connection.execute('SHOW COLUMNS FROM material_request LIKE "status"');
    console.log('Current material_request status ENUM:', mrColumns[0].Type);

    // If needed, update ENUM
    // ALTER TABLE material_request MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'partially_provisioned', 'completed', 'converted', 'cancelled', 'rejected') DEFAULT 'draft';
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
