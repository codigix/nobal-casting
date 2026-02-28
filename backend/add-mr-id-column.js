import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

async function addMrIdColumn() {
  let conn
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Adding mr_id column to job_card table                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    })

    console.log('⏳ Adding mr_id column...')
    await conn.execute(
      'ALTER TABLE job_card ADD COLUMN mr_id VARCHAR(50) NULL AFTER job_card_id'
    )
    console.log('✅ mr_id column added successfully\n')

    console.log('⏳ Adding index on mr_id...')
    try {
      await conn.execute(
        'ALTER TABLE job_card ADD INDEX idx_mr_id (mr_id)'
      )
      console.log('✅ Index created successfully\n')
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('⚠️  Index already exists\n')
      } else {
        throw err
      }
    }

    console.log('🔍 Verifying...')
    const [cols] = await conn.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME="job_card" AND COLUMN_NAME="mr_id"'
    )

    if (cols.length > 0) {
      console.log('✅ Verification successful - mr_id column is now present!\n')
    } else {
      console.log('❌ Verification failed - mr_id column not found\n')
    }
  } catch (e) {
    console.error('❌ Error:', e.message, '\n')
    process.exit(1)
  } finally {
    if (conn) await conn.end()
  }
}

addMrIdColumn()
