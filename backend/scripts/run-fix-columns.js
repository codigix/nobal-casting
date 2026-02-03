import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    multipleStatements: true
  });

  try {
    console.log('Reading fix-work-order-job-card-columns.sql...');
    const sql = fs.readFileSync(path.join(__dirname, 'fix-work-order-job-card-columns.sql'), 'utf8');
    
    console.log('Applying migration...');
    // We split by semicolon to handle each statement separately if needed, 
    // but multipleStatements: true should handle it.
    // However, some might fail if column already exists, so let's be careful.
    
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    
    for (let statement of statements) {
      try {
        console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
        await connection.execute(statement);
        console.log('✓ Success');
      } catch (err) {
        if (err.message.includes('Duplicate column name') || err.message.includes('Duplicate key name')) {
          console.log('ℹ Column/Index already exists, skipping.');
        } else {
          console.error(`✗ Error: ${err.message}`);
        }
      }
    }

    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
