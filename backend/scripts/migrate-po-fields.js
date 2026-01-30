import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
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
    console.log('Reading migration SQL...');
    const sqlPath = path.join(__dirname, 'add-po-shipping-payment-fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split statements (simple split by semicolon)
    // Note: This might be tricky if there are semicolons in strings or triggers,
    // but for this SQL it should be fine.
    const statements = sql
      .replace(/ADD COLUMN IF NOT EXISTS/g, 'ADD COLUMN')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} migration statements...`);

    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log('✓ Executed statement');
      } catch (stmtErr) {
        // Ignore "column exists" errors if IF NOT EXISTS is not supported by execute
        // though ALTER TABLE ADD COLUMN IF NOT EXISTS is MariaDB/MySQL 8.0.19+
        if (stmtErr.code === 'ER_DUP_COLUMN_NAME' || stmtErr.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('⚠ Skipping duplicate column/table');
        } else {
          console.error('✗ Error in statement:', stmtErr.message);
        }
      }
    }

    console.log('Migration completed!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

migrate();
