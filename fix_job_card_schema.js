
import mysql from 'mysql2/promise';

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });

  try {
    console.log('Running migration for job_card table...');
    
    const queries = [
      "ALTER TABLE job_card ADD COLUMN execution_mode ENUM('IN_HOUSE', 'OUTSOURCE') DEFAULT 'IN_HOUSE'",
      "ALTER TABLE job_card ADD COLUMN subcontract_status ENUM('DRAFT', 'READY', 'SENT_TO_VENDOR', 'PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED') DEFAULT 'DRAFT'",
      "ALTER TABLE job_card ADD COLUMN sent_qty DECIMAL(18,6) DEFAULT 0",
      "ALTER TABLE job_card ADD COLUMN received_qty DECIMAL(18,6) DEFAULT 0",
      "ALTER TABLE job_card ADD COLUMN accepted_qty DECIMAL(18,6) DEFAULT 0",
      "ALTER TABLE job_card ADD COLUMN rejected_qty DECIMAL(18,6) DEFAULT 0",
      "ALTER TABLE job_card ADD COLUMN vendor_id VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE job_card ADD COLUMN transferred_quantity DECIMAL(18,6) DEFAULT 0"
    ];

    // Check existing columns first to avoid duplicate errors
    const [cols] = await connection.execute('SHOW COLUMNS FROM job_card');
    const columnNames = cols.map(c => c.Field);

    for (let q of queries) {
        const colName = q.split('COLUMN ')[1].split(' ')[0];
        if (!columnNames.includes(colName)) {
            console.log(`Executing: ${q}`);
            await connection.execute(q);
        } else {
            console.log(`Column ${colName} already exists, skipping.`);
        }
    }

    // Special handling for accepted_quantity vs accepted_qty
    // ProductionModel uses accepted_qty for subcontracting and accepted_quantity for in-house?
    // Let's re-read ProductionModel.js 1845 vs 1850
    
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await connection.end();
  }
}

runMigration();
