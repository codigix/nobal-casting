import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Starting migration...');
    
    // 1. Add priority to job_card if it doesn't exist
    const [columns] = await db.query('SHOW COLUMNS FROM job_card LIKE "priority"');
    if (columns.length === 0) {
      await db.query("ALTER TABLE job_card ADD COLUMN priority VARCHAR(50) DEFAULT 'medium'");
      console.log('✓ Added priority column to job_card');
    } else {
      console.log('→ priority column already exists in job_card');
    }

    // 2. Add last_job_card_id to workstation to track which JC is currently using it
    const [wsColumns] = await db.query('SHOW COLUMNS FROM workstation LIKE "last_job_card_id"');
    if (wsColumns.length === 0) {
      await db.query("ALTER TABLE workstation ADD COLUMN last_job_card_id VARCHAR(50) DEFAULT NULL");
      console.log('✓ Added last_job_card_id column to workstation');
    } else {
      console.log('→ last_job_card_id column already exists in workstation');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await db.end();
  }
}

migrate();
