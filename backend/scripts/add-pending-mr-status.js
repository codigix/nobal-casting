import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function migrate() {
  const connection = await pool.getConnection()
  try {
    console.log('Adding "pending" status to material_request.status ENUM...')

    await connection.execute(`
      ALTER TABLE material_request
      MODIFY status ENUM('draft', 'pending', 'approved', 'converted', 'cancelled') DEFAULT 'draft'
    `)

    console.log('✓ Successfully updated material_request.status ENUM')
  } catch (error) {
    console.error('Migration failed:', error.message)
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

migrate().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
