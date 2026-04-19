
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: process.env.DB_PORT || 3307
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to database');

  try {
    console.log('Adding source_warehouse column to bom_operation table...');
    
    // Check if column already exists
    const [columns] = await connection.query('SHOW COLUMNS FROM bom_operation LIKE "source_warehouse"');
    
    if (columns.length === 0) {
      await connection.query('ALTER TABLE bom_operation ADD COLUMN source_warehouse VARCHAR(255) NULL AFTER target_warehouse');
      console.log('Successfully added source_warehouse column');
    } else {
      console.log('source_warehouse column already exists');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
