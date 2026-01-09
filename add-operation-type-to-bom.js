const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'nobalcasting'
};

(async () => {
  const conn = await mysql.createConnection(config);
  try {
    // Check columns in bom_operation
    const [cols] = await conn.execute(`DESCRIBE bom_operation`);
    const colNames = cols.map(c => c.Field);
    
    // Add operation_type column if it doesn't exist
    if (!colNames.includes('operation_type')) {
      await conn.execute(`ALTER TABLE bom_operation ADD COLUMN operation_type VARCHAR(50) DEFAULT 'IN_HOUSE'`);
      console.log('✓ Added operation_type column to bom_operation');
    } else {
      console.log('→ operation_type column already exists');
    }
    
    // Add updated_at column if it doesn't exist
    if (!colNames.includes('updated_at')) {
      await conn.execute(`ALTER TABLE bom_operation ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      console.log('✓ Added updated_at column to bom_operation');
    } else {
      console.log('→ updated_at column already exists');
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await conn.end();
  }
})();
