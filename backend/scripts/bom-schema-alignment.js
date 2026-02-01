import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

async function runMigration() {
  let connection
  try {
    connection = await mysql.createConnection(config)
    console.log('Connected to database')

    const addColumn = async (tableName, columnName, definition) => {
      try {
        const [columns] = await connection.execute(`SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`)
        if (columns.length === 0) {
          await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
          console.log(`✓ Added column ${columnName} to ${tableName}`)
        } else {
          console.log(`- Column ${columnName} already exists in ${tableName}`)
        }
      } catch (error) {
        console.log(`✗ Error adding ${columnName}: ${error.message}`)
      }
    }

    // Update BOM table with missing fields
    await addColumn('bom', 'product_name', 'VARCHAR(255)')
    await addColumn('bom', 'item_group', 'VARCHAR(100)')
    await addColumn('bom', 'is_active', 'BOOLEAN DEFAULT TRUE')
    await addColumn('bom', 'is_default', 'BOOLEAN DEFAULT FALSE')
    await addColumn('bom', 'allow_alternative_item', 'BOOLEAN DEFAULT FALSE')
    await addColumn('bom', 'auto_sub_assembly_rate', 'BOOLEAN DEFAULT FALSE')
    await addColumn('bom', 'project', 'VARCHAR(100)')
    await addColumn('bom', 'cost_rate_based_on', "VARCHAR(50) DEFAULT 'Valuation Rate'")
    await addColumn('bom', 'valuation_rate_value', 'DECIMAL(18,6) DEFAULT 0')
    await addColumn('bom', 'selling_rate', 'DECIMAL(18,6) DEFAULT 0')
    await addColumn('bom', 'currency', "VARCHAR(10) DEFAULT 'INR'")
    await addColumn('bom', 'with_operations', 'BOOLEAN DEFAULT FALSE')
    await addColumn('bom', 'process_loss_percentage', 'DECIMAL(5,2) DEFAULT 0')
    await addColumn('bom', 'transfer_material_against', "VARCHAR(50) DEFAULT 'Work Order'")
    await addColumn('bom', 'routing', 'VARCHAR(100)')
    await addColumn('bom', 'total_cost', 'DECIMAL(18,6) DEFAULT 0')

    // Update bom_line table
    await addColumn('bom_line', 'loss_percentage', 'DECIMAL(5,2) DEFAULT 0')
    await addColumn('bom_line', 'scrap_qty', 'DECIMAL(18,6) DEFAULT 0')

    // Update bom_operation table
    await addColumn('bom_operation', 'setup_time', 'DECIMAL(10,2) DEFAULT 0')
    await addColumn('bom_operation', 'hourly_rate', 'DECIMAL(18,2) DEFAULT 0')
    await addColumn('bom_operation', 'operation_type', "VARCHAR(50) DEFAULT 'IN_HOUSE'")
    await addColumn('bom_operation', 'target_warehouse', 'VARCHAR(100)')

    // Update bom_scrap table
    await addColumn('bom_scrap', 'input_quantity', 'DECIMAL(18,6) DEFAULT 0')
    await addColumn('bom_scrap', 'loss_percentage', 'DECIMAL(5,2) DEFAULT 0')

    const tableQueries = [
      // Create bom_raw_material table
      `CREATE TABLE IF NOT EXISTS bom_raw_material (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        item_group VARCHAR(100),
        component_type VARCHAR(50),
        qty DECIMAL(18,6) NOT NULL,
        uom VARCHAR(50),
        rate DECIMAL(18,6) DEFAULT 0,
        amount DECIMAL(18,6) DEFAULT 0,
        source_warehouse VARCHAR(100),
        operation VARCHAR(100),
        sequence INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
        FOREIGN KEY (item_code) REFERENCES item(item_code),
        INDEX idx_bom_id (bom_id),
        INDEX idx_item_code (item_code),
        INDEX idx_sequence (sequence)
      )`,

      // Ensure bom_operation table exists
      `CREATE TABLE IF NOT EXISTS bom_operation (
        operation_id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id VARCHAR(50) NOT NULL,
        operation_name VARCHAR(100),
        workstation_type VARCHAR(100),
        operation_time DECIMAL(10,2),
        setup_time DECIMAL(10,2) DEFAULT 0,
        fixed_time DECIMAL(10,2) DEFAULT 0,
        hourly_rate DECIMAL(18,2) DEFAULT 0,
        operating_cost DECIMAL(18,2) DEFAULT 0,
        operation_type VARCHAR(50) DEFAULT 'IN_HOUSE',
        target_warehouse VARCHAR(100),
        sequence INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
        INDEX idx_bom_id (bom_id),
        INDEX idx_sequence (sequence)
      )`,

      // Ensure bom_scrap table exists
      `CREATE TABLE IF NOT EXISTS bom_scrap (
        scrap_id INT AUTO_INCREMENT PRIMARY KEY,
        bom_id VARCHAR(50) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        item_name VARCHAR(255),
        quantity DECIMAL(18,6),
        rate DECIMAL(18,2),
        sequence INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bom_id) REFERENCES bom(bom_id) ON DELETE CASCADE,
        FOREIGN KEY (item_code) REFERENCES item(item_code),
        INDEX idx_bom_id (bom_id),
        INDEX idx_sequence (sequence)
      )`
    ]

    for (const query of tableQueries) {
      try {
        await connection.execute(query)
        console.log('✓ Executed: ' + query.substring(0, 50) + '...')
      } catch (error) {
        console.log('✗ Error: ' + error.message)
      }
    }

    console.log('BOM Schema Alignment completed!')
  } catch (error) {
    console.error('Migration failed: ' + error.message)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

runMigration()
