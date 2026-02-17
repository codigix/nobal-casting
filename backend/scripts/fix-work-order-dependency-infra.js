import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: 'backend/.env' })

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3306')
}

async function runMigration() {
  const connection = await mysql.createConnection(config)
  console.log('Connected to database')

  try {
    // 1. Create work_order_dependency table
    console.log('Creating work_order_dependency table...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS work_order_dependency (
        dependency_id INT AUTO_INCREMENT PRIMARY KEY,
        parent_wo_id VARCHAR(50) NOT NULL,
        child_wo_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        required_qty DECIMAL(18,6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_dependency (parent_wo_id, child_wo_id),
        FOREIGN KEY (parent_wo_id) REFERENCES work_order(wo_id) ON DELETE CASCADE,
        FOREIGN KEY (child_wo_id) REFERENCES work_order(wo_id) ON DELETE CASCADE,
        INDEX idx_parent (parent_wo_id),
        INDEX idx_child (child_wo_id)
      )
    `)
    console.log('✓ work_order_dependency table ready')

    // 2. Add cost columns to work_order
    console.log('Adding cost columns to work_order...')
    const columnsToAdd = [
      { name: 'operation_cost', type: 'DECIMAL(18,2) DEFAULT 0' },
      { name: 'material_cost', type: 'DECIMAL(18,2) DEFAULT 0' }
    ]

    for (const col of columnsToAdd) {
      try {
        await connection.execute(`ALTER TABLE work_order ADD COLUMN ${col.name} ${col.type}`)
        console.log(`✓ Added column ${col.name}`)
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`✓ Column ${col.name} already exists`)
        } else {
          throw err
        }
      }
    }

    // 3. Update status enum
    console.log('Updating work_order status enum...')
    // First, change to VARCHAR to allow any value during transition
    await connection.execute("ALTER TABLE work_order MODIFY COLUMN status VARCHAR(50)")
    
    // Update existing values to match new casing
    await connection.execute("UPDATE work_order SET status = 'Draft' WHERE status = 'draft'")
    await connection.execute("UPDATE work_order SET status = 'Approved' WHERE status = 'approved'")
    await connection.execute("UPDATE work_order SET status = 'In-Progress' WHERE status = 'in_progress'")
    await connection.execute("UPDATE work_order SET status = 'Completed' WHERE status = 'completed'")
    await connection.execute("UPDATE work_order SET status = 'Cancelled' WHERE status = 'cancelled'")

    // Change back to new ENUM
    await connection.execute(`
      ALTER TABLE work_order MODIFY COLUMN status 
      ENUM('Draft', 'Ready', 'Approved', 'In Progress', 'In-Progress', 'in_progress', 'Completed', 'Cancelled') 
      DEFAULT 'Draft'
    `)
    console.log('✓ work_order status enum updated')

    console.log('\n✅ Infrastructure migration completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
  } finally {
    await connection.end()
  }
}

runMigration()
