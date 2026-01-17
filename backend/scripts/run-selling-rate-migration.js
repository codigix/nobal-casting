import mysql from 'mysql2/promise';

async function runMigration() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });
    
    console.log('Running selling_rate migration...');
    
    const [columns] = await connection.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = "item" AND COLUMN_NAME = "selling_rate"'
    );
    
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE item ADD COLUMN selling_rate DECIMAL(15,2) DEFAULT 0');
      console.log('✓ selling_rate column added to item table');
    } else {
      console.log('✓ selling_rate column already exists');
    }
    
    const [indexes] = await connection.execute(
      'SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_NAME = "item" AND INDEX_NAME = "idx_selling_rate"'
    );
    
    if (indexes.length === 0) {
      await connection.execute('CREATE INDEX idx_selling_rate ON item(selling_rate)');
      console.log('✓ Index created on selling_rate column');
    } else {
      console.log('✓ Index already exists');
    }
    
    await connection.end();
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
