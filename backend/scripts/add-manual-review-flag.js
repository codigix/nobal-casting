import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function addManualReviewFlag() {
  let connection

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Add Manual Review Flag Column                             ║')
    console.log('║  Allows flagging requests that need manual review           ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'nobalcasting'
    }

    console.log('📡 Connecting to database:', dbConfig.database)
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connection established\n')

    // Step 1: Check if columns already exist
    console.log('1️⃣  Checking schema...')
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'material_request' AND TABLE_SCHEMA = ?`,
      [dbConfig.database]
    )

    const columnNames = columns.map(c => c.COLUMN_NAME)
    const hasReviewFlag = columnNames.includes('requires_manual_review')
    const hasReviewReason = columnNames.includes('review_reason')

    if (hasReviewFlag && hasReviewReason) {
      console.log('   ✅ Columns already exist - No migration needed!\n')
      return
    }

    console.log('   Current columns:', columnNames.join(', '))
    console.log()

    // Step 2: Add columns if missing
    console.log('2️⃣  Adding new columns...')

    if (!hasReviewFlag) {
      await connection.execute(
        `ALTER TABLE material_request 
         ADD COLUMN requires_manual_review BOOLEAN DEFAULT FALSE`
      )
      console.log('   ✅ Added requires_manual_review column')
    }

    if (!hasReviewReason) {
      await connection.execute(
        `ALTER TABLE material_request 
         ADD COLUMN review_reason VARCHAR(500) DEFAULT NULL`
      )
      console.log('   ✅ Added review_reason column')
    }

    console.log()

    // Step 3: Create audit table if not exists (for tracking flagged requests)
    console.log('3️⃣  Setting up audit table...')
    
    const [tableCheck] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'manual_review_queue'`,
      [dbConfig.database]
    )

    if (!tableCheck.length) {
      console.log('   Creating manual_review_queue table...')
      await connection.execute(
        `CREATE TABLE manual_review_queue (
          id INT AUTO_INCREMENT PRIMARY KEY,
          mr_id VARCHAR(50) NOT NULL UNIQUE,
          reason VARCHAR(500),
          status ENUM('pending', 'reviewed', 'approved', 'rejected') DEFAULT 'pending',
          reviewed_by VARCHAR(100),
          reviewed_at TIMESTAMP NULL,
          comments VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_mr (mr_id),
          INDEX idx_status (status),
          FOREIGN KEY (mr_id) REFERENCES material_request(mr_id)
        )
      `)
      console.log('   ✅ Created manual_review_queue table')
    } else {
      console.log('   ✅ manual_review_queue table already exists')
    }

    console.log()

    // Step 4: Verify changes
    console.log('4️⃣  Verifying schema changes...')
    const [updatedColumns] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'material_request' AND TABLE_SCHEMA = ?`,
      [dbConfig.database]
    )

    const updatedNames = updatedColumns.map(c => c.COLUMN_NAME)
    console.log('   Updated columns:', updatedNames.join(', '))
    console.log()

    // Step 5: Summary
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Migration completed successfully!                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('New schema:')
    console.log('  ✓ material_request.requires_manual_review (BOOLEAN)')
    console.log('  ✓ material_request.review_reason (VARCHAR 500)')
    console.log('  ✓ manual_review_queue table created\n')

    console.log('How to flag a request for review:')
    console.log('  UPDATE material_request SET requires_manual_review = TRUE, review_reason = "..." WHERE mr_id = "..."')
    console.log()

    console.log('Next steps:')
    console.log('  1. Run strategy-3 to implement automatic flagging on invalid requests')
    console.log('  2. Update frontend to show review flags in Material Request list')
    console.log('  3. Create admin review workflow\n')

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗')
    console.error('║  ❌ Migration failed!                                     ║')
    console.error('╚════════════════════════════════════════════════════════════╝\n')
    console.error('Error:', error.message)

    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

addManualReviewFlag().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
