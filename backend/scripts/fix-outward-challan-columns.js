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

    // 1. Fix outward_challan columns
    const [ocColumns] = await connection.query('SHOW COLUMNS FROM outward_challan');
    const ocColumnNames = ocColumns.map(c => c.Field.toLowerCase());

    const ocMissingColumns = [
      { name: 'transporter_name', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'vehicle_number', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'eway_bill_no', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'dispatch_date', definition: 'DATE DEFAULT NULL' }
    ];

    for (const col of ocMissingColumns) {
      if (!ocColumnNames.includes(col.name.toLowerCase())) {
        console.log(`➕ Adding column ${col.name} to outward_challan...`);
        await connection.query(`ALTER TABLE outward_challan ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`✅ Added ${col.name} to outward_challan`);
      } else {
        console.log(`ℹ️ Column ${col.name} already exists in outward_challan`);
      }
    }

    // 2. Fix job_card columns (just in case)
    const [jcColumns] = await connection.query('SHOW COLUMNS FROM job_card');
    const jcColumnNames = jcColumns.map(c => c.Field.toLowerCase());

    const jcMissingColumns = [
      { name: 'carrier_name', definition: 'VARCHAR(255) DEFAULT NULL' },
      { name: 'tracking_number', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'dispatch_date', definition: 'DATE DEFAULT NULL' },
      { name: 'shipping_notes', definition: 'TEXT DEFAULT NULL' },
      { name: 'is_partial', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'is_shipment', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'source_warehouse_id', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'target_warehouse_id', definition: 'VARCHAR(100) DEFAULT NULL' },
      { name: 'dispatch_qty', definition: 'DECIMAL(18, 4) DEFAULT 0' }
    ];

    for (const col of jcMissingColumns) {
      if (!jcColumnNames.includes(col.name.toLowerCase())) {
        console.log(`➕ Adding column ${col.name} to job_card...`);
        await connection.query(`ALTER TABLE job_card ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`✅ Added ${col.name} to job_card`);
      } else {
        console.log(`ℹ️ Column ${col.name} already exists in job_card`);
      }
    }

    // 3. Add Indexes if they don't exist
    try {
      await connection.query('CREATE INDEX idx_job_card_dispatch_date ON job_card(dispatch_date)');
      console.log('✅ Created index idx_job_card_dispatch_date');
    } catch (e) { console.log('ℹ️ Index idx_job_card_dispatch_date already exists or failed'); }

    try {
      await connection.query('CREATE INDEX idx_job_card_is_shipment ON job_card(is_shipment)');
      console.log('✅ Created index idx_job_card_is_shipment');
    } catch (e) { console.log('ℹ️ Index idx_job_card_is_shipment already exists or failed'); }

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
