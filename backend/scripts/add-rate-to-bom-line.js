import mysql from 'mysql2/promise';

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting'
    });

    console.log('Adding rate and amount columns to bom_line table...');
    
    try {
      await connection.query('ALTER TABLE bom_line ADD COLUMN rate DECIMAL(15,2) DEFAULT 0 AFTER uom');
      console.log('✓ Added rate column to bom_line');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('→ rate column already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query('ALTER TABLE bom_line ADD COLUMN amount DECIMAL(18,6) DEFAULT 0 AFTER rate');
      console.log('✓ Added amount column to bom_line');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('→ amount column already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query('CREATE INDEX idx_bom_line_rate ON bom_line(rate)');
      console.log('✓ Created index on rate column');
    } catch (err) {
      if (err.message.includes('Duplicate key')) {
        console.log('→ Index already exists');
      } else {
        throw err;
      }
    }

    await connection.end();
    console.log('✓ Migration completed successfully');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
