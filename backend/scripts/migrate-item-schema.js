import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp',
})

const columns = [
  { name: 'disabled', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'allow_alternative_item', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'maintain_stock', type: 'BOOLEAN DEFAULT TRUE' },
  { name: 'has_variants', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'opening_stock', type: 'DECIMAL(15,3) DEFAULT 0' },
  { name: 'valuation_rate', type: 'DECIMAL(15,2) DEFAULT 0' },
  { name: 'valuation_method', type: 'VARCHAR(50) DEFAULT "FIFO"' },
  { name: 'standard_selling_rate', type: 'DECIMAL(15,2) DEFAULT 0' },
  { name: 'is_fixed_asset', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'shelf_life_in_days', type: 'INT' },
  { name: 'warranty_period_in_days', type: 'INT' },
  { name: 'end_of_life', type: 'DATE' },
  { name: 'weight_per_unit', type: 'DECIMAL(15,3)' },
  { name: 'weight_uom', type: 'VARCHAR(20)' },
  { name: 'allow_negative_stock', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'has_batch_no', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'has_serial_no', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'automatically_create_batch', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'batch_number_series', type: 'VARCHAR(100)' },
  { name: 'has_expiry_date', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'retain_sample', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'max_sample_quantity', type: 'DECIMAL(15,3)' },
  { name: 'default_purchase_uom', type: 'VARCHAR(10)' },
  { name: 'lead_time_days', type: 'INT DEFAULT 0' },
  { name: 'minimum_order_qty', type: 'DECIMAL(15,3) DEFAULT 1' },
  { name: 'safety_stock', type: 'DECIMAL(15,3) DEFAULT 0' },
  { name: 'is_customer_provided_item', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'default_sales_uom', type: 'VARCHAR(10)' },
  { name: 'max_discount_percentage', type: 'DECIMAL(5,2) DEFAULT 0' },
  { name: 'grant_commission', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'allow_sales', type: 'BOOLEAN DEFAULT TRUE' },
  { name: 'cess_rate', type: 'DECIMAL(5,2) DEFAULT 0' },
  { name: 'inclusive_tax', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'supply_raw_materials_for_purchase', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'include_item_in_manufacturing', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'no_of_cavities', type: 'INT DEFAULT 1' },
  { name: 'family_mould', type: 'BOOLEAN DEFAULT FALSE' },
  { name: 'mould_number', type: 'VARCHAR(100)' },
]

const createTableQueries = [
  `CREATE TABLE IF NOT EXISTS item_barcode (
    barcode_id VARCHAR(50) PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    barcode VARCHAR(100) UNIQUE,
    barcode_name VARCHAR(255),
    barcode_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE,
    INDEX idx_item_code (item_code)
  )`,
  
  `CREATE TABLE IF NOT EXISTS item_supplier (
    item_supplier_id VARCHAR(50) PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    supplier_id VARCHAR(50),
    supplier_name VARCHAR(255),
    supplier_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE,
    INDEX idx_item (item_code)
  )`,
  
  `CREATE TABLE IF NOT EXISTS item_customer_detail (
    customer_detail_id VARCHAR(50) PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255),
    customer_group VARCHAR(100),
    ref_code VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE,
    INDEX idx_item (item_code)
  )`,
  
  `CREATE TABLE IF NOT EXISTS item_dimension_parameter (
    parameter_id VARCHAR(50) PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    parameter_type VARCHAR(50),
    name VARCHAR(255),
    parameter VARCHAR(255),
    value VARCHAR(255),
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_code) REFERENCES item(item_code) ON DELETE CASCADE,
    INDEX idx_item (item_code)
  )`,
]

try {
  console.log('Starting item schema migration...\n')
  
  let count = 0
  for (const col of columns) {
    try {
      const [result] = await conn.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='item' AND COLUMN_NAME=?`,
        [col.name]
      )
      
      if (result.length === 0) {
        await conn.execute(`ALTER TABLE item ADD COLUMN ${col.name} ${col.type}`)
        console.log(`✓ Added column: ${col.name}`)
        count++
      } else {
        console.log(`- Column ${col.name} already exists`)
      }
    } catch (error) {
      console.error(`✗ Error adding ${col.name}:`, error.message)
    }
  }
  
  console.log(`\n✓ Added ${count}/${columns.length} columns to item table\n`)
  
  for (const query of createTableQueries) {
    try {
      await conn.execute(query)
      const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1]
      console.log(`✓ Created table: ${tableName}`)
    } catch (error) {
      console.error(`✗ Error creating table:`, error.message)
    }
  }
  
  console.log('\n✓ Item schema migration completed successfully!')
  
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
} finally {
  await conn.end()
}
