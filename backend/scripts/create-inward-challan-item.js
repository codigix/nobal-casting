import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  try {
    console.log('Starting migration: create inward_challan_item table');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS inward_challan_item (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challan_id INT NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        batch_no VARCHAR(100),
        dispatched_qty DECIMAL(18, 4) DEFAULT 0,
        received_qty DECIMAL(18, 4) DEFAULT 0,
        accepted_qty DECIMAL(18, 4) DEFAULT 0,
        rejected_qty DECIMAL(18, 4) DEFAULT 0,
        uom VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (challan_id) REFERENCES inward_challan(id) ON DELETE CASCADE,
        INDEX idx_ic_item_challan_id (challan_id),
        INDEX idx_ic_item_code (item_code)
      )
    `);
    
    console.log('✓ inward_challan_item table created successfully');

    await db.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
