
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: 'root',
    password: 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    multipleStatements: true
  });

  try {
    console.log('Running migration: add-shipment-and-warehouse-to-job-card.sql...');
    const sql = fs.readFileSync(path.join(__dirname, 'add-shipment-and-warehouse-to-job-card.sql'), 'utf8');
    
    // Split and run statements manually to avoid "multipleStatements" issues with IF NOT EXISTS in some mysql versions
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
          console.log(`Column/Index already exists, skipping...`);
        } else {
          console.error(`Error executing statement: ${statement}`);
          console.error(err);
        }
      }
    }
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
