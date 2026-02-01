import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting',
});

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('Adding material_status and mr_id to production_plan_raw_material...');
    
    // Check material_status
    const [statusCols] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'production_plan_raw_material' AND COLUMN_NAME = 'material_status'"
    );

    if (statusCols.length === 0) {
      await connection.execute("ALTER TABLE production_plan_raw_material ADD COLUMN material_status VARCHAR(50) DEFAULT 'pending'");
      console.log('✓ Added material_status');
    }

    // Check mr_id
    const [mrIdCols] = await connection.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'production_plan_raw_material' AND COLUMN_NAME = 'mr_id'"
    );

    if (mrIdCols.length === 0) {
      await connection.execute("ALTER TABLE production_plan_raw_material ADD COLUMN mr_id VARCHAR(50)");
      await connection.execute("CREATE INDEX idx_pprm_mr_id ON production_plan_raw_material(mr_id)");
      console.log('✓ Added mr_id');
    }

    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
