import mysql from 'mysql2/promise';

async function migrate() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting'
  };

  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('Migrating production_entry table...');
    
    // Add job_card_id
    await connection.query('ALTER TABLE production_entry ADD COLUMN job_card_id VARCHAR(50) AFTER work_order_id');
    console.log('- Added job_card_id');
    
    // Add accepted_quantity
    await connection.query('ALTER TABLE production_entry ADD COLUMN accepted_quantity DECIMAL(18,6) DEFAULT 0 AFTER quantity_produced');
    console.log('- Added accepted_quantity');
    
    // Add scrap_quantity
    await connection.query('ALTER TABLE production_entry ADD COLUMN scrap_quantity DECIMAL(18,6) DEFAULT 0 AFTER quantity_rejected');
    console.log('- Added scrap_quantity');
    
    // Change quantity_produced and quantity_rejected to DECIMAL for consistency
    await connection.query('ALTER TABLE production_entry MODIFY COLUMN quantity_produced DECIMAL(18,6) DEFAULT 0');
    await connection.query('ALTER TABLE production_entry MODIFY COLUMN quantity_rejected DECIMAL(18,6) DEFAULT 0');
    console.log('- Updated quantity columns to DECIMAL');

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await connection.end();
  }
}

migrate();
