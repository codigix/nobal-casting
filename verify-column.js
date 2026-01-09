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
    // Check if operation_type column exists
    const [rows] = await conn.execute(`DESCRIBE operation`);
    const hasOperationType = rows.some(r => r.Field === 'operation_type');
    console.log('operation_type column exists:', hasOperationType);
    
    if (!hasOperationType) {
      // Try to add the column without backticks
      await conn.execute(`ALTER TABLE operation ADD COLUMN operation_type VARCHAR(50) DEFAULT 'IN_HOUSE'`);
      console.log('Added operation_type column');
    }
    
    // Check bom_operation table
    const [bom_cols] = await conn.execute(`DESCRIBE bom_operation`);
    console.log('bom_operation table exists with columns:', bom_cols.map(c => c.Field).join(', '));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await conn.end();
  }
})();
