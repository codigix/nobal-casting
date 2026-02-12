import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Starting migration: create outward_challan_item table');
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS outward_challan_item (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challan_id INT NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        required_qty DECIMAL(18,6) DEFAULT 0,
        release_qty DECIMAL(18,6) DEFAULT 0,
        uom VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (challan_id) REFERENCES outward_challan(id) ON DELETE CASCADE,
        INDEX idx_challan_id (challan_id),
        INDEX idx_item_code (item_code)
      )
    `);
    
    console.log('✓ outward_challan_item table created successfully');

    // Also check if outward_challan needs columns
    const [cols] = await db.query('SHOW COLUMNS FROM outward_challan LIKE "dispatch_quantity"');
    if (cols.length === 0) {
        await db.execute('ALTER TABLE outward_challan ADD COLUMN dispatch_quantity DECIMAL(18,6) DEFAULT 0 AFTER expected_return_date');
        console.log('✓ added dispatch_quantity to outward_challan');
    }

    // Add outward_challan_id to job_card
    const [jcCols] = await db.query('SHOW COLUMNS FROM job_card LIKE "outward_challan_id"');
    if (jcCols.length === 0) {
        await db.execute('ALTER TABLE job_card ADD COLUMN outward_challan_id INT AFTER subcontract_status');
        await db.execute('ALTER TABLE job_card ADD FOREIGN KEY (outward_challan_id) REFERENCES outward_challan(id) ON DELETE SET NULL');
        console.log('✓ added outward_challan_id to job_card');
    }

    await db.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
