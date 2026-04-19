import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3306
};

async function migrate() {
  let connection;
  try {
    console.log('📡 Connecting to database:', dbConfig.database);
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connection established');

    // 1. Create job_card_buffer table
    console.log('📦 Creating job_card_buffer table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS job_card_buffer (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_card_id VARCHAR(50) NOT NULL,
        source_item_code VARCHAR(100) NOT NULL,
        source_job_card_id VARCHAR(50),
        available_qty DECIMAL(18, 6) NOT NULL DEFAULT 0,
        consumed_qty DECIMAL(18, 6) NOT NULL DEFAULT 0,
        uom VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_card_id (job_card_id),
        INDEX idx_source_item (source_item_code),
        INDEX idx_source_job_card (source_job_card_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ job_card_buffer table ready');

    // 2. Add missing columns to job_card
    const [columns] = await connection.query('SHOW COLUMNS FROM job_card');
    const columnNames = columns.map(c => c.Field.toLowerCase());

    const missingColumns = [
      { name: 'input_buffer_qty', definition: 'DECIMAL(18, 6) NOT NULL DEFAULT 0 AFTER planned_quantity' },
      { name: 'max_allowed_quantity', definition: 'DECIMAL(18, 6) NOT NULL DEFAULT 0 AFTER input_buffer_qty' },
      { name: 'available_to_transfer', definition: 'DECIMAL(18, 6) NOT NULL DEFAULT 0 AFTER accepted_quantity' },
      { name: 'plan_operation_sequence', definition: 'INT AFTER operation_sequence' }
    ];

    for (const col of missingColumns) {
      if (!columnNames.includes(col.name.toLowerCase())) {
        console.log(`➕ Adding column ${col.name}...`);
        await connection.query(`ALTER TABLE job_card ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`✅ Added ${col.name}`);
      } else {
        console.log(`ℹ️ Column ${col.name} already exists`);
      }
    }

    // 3. Initialize input_buffer_qty for existing job cards
    console.log('🔧 Initializing existing job card buffers...');
    await connection.query(`
      UPDATE job_card 
      SET input_buffer_qty = planned_quantity 
      WHERE status IN ('in-progress', 'completed') AND input_buffer_qty = 0
    `);
    console.log('✅ Buffer initialization complete');

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
