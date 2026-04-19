
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    console.log('Adding transport columns to outward_challan table...');
    
    // Add columns if they don't exist
    const columnsToAdd = [
      { name: 'transporter_name', type: 'VARCHAR(255)' },
      { name: 'vehicle_number', type: 'VARCHAR(50)' },
      { name: 'eway_bill_no', type: 'VARCHAR(50)' },
      { name: 'dispatch_date', type: 'DATE' }
    ];

    for (const col of columnsToAdd) {
      try {
        await connection.query(`ALTER TABLE outward_challan ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✓ Added ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
          console.log(`- ${col.name} already exists`);
        } else {
          throw err;
        }
      }
    }

    // Also update dispatch_date to default to challan_date if null
    await connection.query(`UPDATE outward_challan SET dispatch_date = DATE(challan_date) WHERE dispatch_date IS NULL`);

    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
