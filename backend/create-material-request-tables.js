import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function createMaterialRequestTables() {
  const connection = await pool.getConnection()
  
  try {
    console.log('Creating material request tables...')
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS material_request (
        mr_id VARCHAR(100) PRIMARY KEY,
        naming_series VARCHAR(50),
        requested_by_id VARCHAR(100),
        requested_by_name VARCHAR(255),
        department VARCHAR(100),
        required_by_date DATE,
        purpose TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        approval_status VARCHAR(50) DEFAULT 'pending',
        approved_by_id VARCHAR(100),
        approved_at TIMESTAMP NULL,
        source_warehouse VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_department (department),
        INDEX idx_requested_by (requested_by_id),
        INDEX idx_approval_status (approval_status)
      )
    `)
    console.log('✓ material_request table created')
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS material_request_item (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mr_id VARCHAR(100) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        item_group VARCHAR(100),
        qty DECIMAL(18,6) NOT NULL,
        uom VARCHAR(50),
        rate DECIMAL(15,2),
        amount DECIMAL(15,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mr_id) REFERENCES material_request(mr_id) ON DELETE CASCADE,
        INDEX idx_mr_id (mr_id),
        INDEX idx_item_code (item_code)
      )
    `)
    console.log('✓ material_request_item table created')
    
    console.log('✓ All material request tables created successfully!')
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('✓ Tables already exist')
    } else {
      console.error('✗ Error creating tables:', error.message)
      throw error
    }
  } finally {
    await connection.release()
    await pool.end()
  }
}

createMaterialRequestTables()
  .then(() => {
    console.log('All tasks completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
