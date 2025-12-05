import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function migrateSchema() {
  const connection = await pool.getConnection()

  try {
    console.log('Starting purchase_receipt_item schema migration...')

    // Check current schema
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'purchase_receipt_item' AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME])

    console.log('Current purchase_receipt_item columns:', columns.map(c => ({
      name: c.COLUMN_NAME,
      type: c.COLUMN_TYPE,
      key: c.COLUMN_KEY
    })))

    // Check if migration is needed
    const hasGrnItemId = columns.some(c => c.COLUMN_NAME === 'grn_item_id')
    const hasOldId = columns.some(c => c.COLUMN_NAME === 'id' && c.COLUMN_KEY === 'PRI')
    const isGrnItemIdPrimary = columns.some(c => c.COLUMN_NAME === 'grn_item_id' && c.COLUMN_KEY === 'PRI')

    if (isGrnItemIdPrimary && !hasOldId) {
      console.log('✅ Schema is already fully migrated. grn_item_id is PRIMARY KEY.')
      return
    }

    if (!hasGrnItemId && !hasOldId) {
      console.log('❌ Unexpected schema. Cannot determine if migration is needed.')
      return
    }

    console.log('⏳ Migrating schema...')

    // Step 1: Get count of records
    const [[{ count }]] = await connection.query(`SELECT COUNT(*) as count FROM purchase_receipt_item`)
    console.log(`Found ${count} records in purchase_receipt_item`)

    // Step 2: Only add grn_item_id if it doesn't exist yet
    if (!hasGrnItemId) {
      // Step 3: Add grn_item_id column as VARCHAR
      await connection.query(`
        ALTER TABLE purchase_receipt_item 
        ADD COLUMN grn_item_id VARCHAR(50) AFTER id
      `)
      console.log('✓ Added grn_item_id column')

      // Step 4: Generate UUID values for grn_item_id
      await connection.query(`
        UPDATE purchase_receipt_item 
        SET grn_item_id = CONCAT('PRI-', id, '-', DATE_FORMAT(NOW(), '%s%f'))
        WHERE grn_item_id IS NULL
      `)
      console.log('✓ Generated grn_item_id values')
    } else {
      console.log('✓ grn_item_id column already exists, skipping creation')
    }

    // Step 5: Remove AUTO_INCREMENT from id column first
    await connection.query(`
      ALTER TABLE purchase_receipt_item 
      MODIFY COLUMN id INT
    `)
    console.log('✓ Removed AUTO_INCREMENT from id column')

    // Step 6: Drop old id primary key
    await connection.query(`
      ALTER TABLE purchase_receipt_item 
      DROP PRIMARY KEY
    `)
    console.log('✓ Dropped old id primary key')

    // Step 7: Make grn_item_id unique and not null
    await connection.query(`
      ALTER TABLE purchase_receipt_item 
      MODIFY COLUMN grn_item_id VARCHAR(50) NOT NULL UNIQUE
    `)
    console.log('✓ Made grn_item_id NOT NULL and UNIQUE')

    // Step 8: Make grn_item_id the primary key
    await connection.query(`
      ALTER TABLE purchase_receipt_item 
      ADD PRIMARY KEY (grn_item_id)
    `)
    console.log('✓ Added grn_item_id as PRIMARY KEY')

    // Step 9: Drop old id column
    await connection.query(`
      ALTER TABLE purchase_receipt_item 
      DROP COLUMN id
    `)
    console.log('✓ Dropped old id column')

    // Step 10: Add created_at if not exists
    const hasCreatedAt = columns.some(c => c.COLUMN_NAME === 'created_at')
    if (!hasCreatedAt) {
      await connection.query(`
        ALTER TABLE purchase_receipt_item 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `)
      console.log('✓ Added created_at column')
    }

    // Step 11: Add indexes
    await connection.query(`
      ALTER TABLE purchase_receipt_item 
      ADD INDEX idx_grn (grn_no)
    `)
    console.log('✓ Added index on grn_no')

    // Verify final schema
    const [finalColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'purchase_receipt_item' AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME])

    console.log('\n✅ Migration completed successfully!')
    console.log('Final purchase_receipt_item schema:', finalColumns.map(c => ({
      name: c.COLUMN_NAME,
      type: c.COLUMN_TYPE,
      key: c.COLUMN_KEY
    })))

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  } finally {
    await connection.release()
    await pool.end()
  }
}

migrateSchema().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})