import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'erp_user',
  password: 'erp_password',
  database: 'aluminium_erp',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function addColumn() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to database');
    
    await connection.query(
      `ALTER TABLE grn_requests ADD COLUMN inspection_completed_by INT AFTER approved_by`
    );
    
    await connection.query(
      `ALTER TABLE grn_requests ADD CONSTRAINT fk_inspection_completed_by FOREIGN KEY (inspection_completed_by) REFERENCES users(id)`
    );
    
    console.log('Successfully added inspection_completed_by column');
    connection.release();
    await pool.end();
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate column name')) {
      console.log('Column already exists, skipping...');
      await pool.end();
    } else if (error.message.includes('already exists') && error.message.includes('CONSTRAINT')) {
      console.log('Foreign key already exists, skipping...');
      await pool.end();
    } else {
      console.error('Error adding column:', error.message);
      process.exit(1);
    }
  }
}

addColumn();
