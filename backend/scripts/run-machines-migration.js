import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    
    const sqlFile = path.join(__dirname, 'create-machines-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Running machines table migration...');
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }
    
    console.log('✓ Machines table created and seeded successfully');
    
    const [machines] = await connection.execute('SELECT COUNT(*) as count FROM production_machines');
    console.log(`✓ Total machines: ${machines[0].count}`);
    
    await connection.end();
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
