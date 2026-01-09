const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function runMigration() {
  const connection = await mysql.createConnection(config);
  try {
    console.log('Starting migration...');
    
    // Add operation_type column to operation table
    try {
      await connection.execute(`ALTER TABLE operation ADD COLUMN IF NOT EXISTS operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE'`);
      console.log('✓ Added operation_type column to operation table');
    } catch (e) {
      console.log('→ operation_type column:', e.message.substring(0, 80));
    }
    
    // Add index for operation_type
    try {
      await connection.execute(`ALTER TABLE operation ADD INDEX IF NOT EXISTS idx_operation_type (operation_type)`);
      console.log('✓ Added index for operation_type');
    } catch (e) {
      console.log('→ Index:', e.message.substring(0, 80));
    }
    
    // Create bom_operation table
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS bom_operation (
          operation_id INT AUTO_INCREMENT PRIMARY KEY,
          bom_id VARCHAR(50) NOT NULL,
          operation_name VARCHAR(255),
          workstation_type VARCHAR(100),
          operation_time DECIMAL(10,2),
          fixed_time DECIMAL(10,2),
          operating_cost DECIMAL(12,4),
          operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE',
          sequence INT,
          notes LONGTEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
          INDEX idx_bom_id (bom_id),
          INDEX idx_operation_type (operation_type),
          INDEX idx_sequence (sequence)
        )
      `);
      console.log('✓ Created bom_operation table');
    } catch (e) {
      console.log('→ bom_operation table:', e.message.substring(0, 100));
    }
    
    // Add operation_type column to bom_operation if needed
    try {
      await connection.execute(`ALTER TABLE bom_operation ADD COLUMN IF NOT EXISTS operation_type ENUM('IN_HOUSE', 'OUTSOURCED') DEFAULT 'IN_HOUSE'`);
      console.log('✓ Ensured operation_type column exists in bom_operation');
    } catch (e) {
      console.log('→ bom_operation.operation_type:', e.message.substring(0, 80));
    }
    
    console.log('\n✓ Migration completed successfully');
  } catch (err) {
    console.error('✗ Migration error:', err.message);
  } finally {
    await connection.end();
  }
}

runMigration();
