import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '../.env') })

const operations = [
  { name: 'sand-blasting', operation_name: 'sand blasting' },
  { name: 'engraving', operation_name: 'ENGRAVING' },
  { name: 'buffing', operation_name: 'BUFFING' },
  { name: 'machining-op-40', operation_name: 'MACHINING OP-40' },
  { name: 'machining-op-30', operation_name: 'MACHINING OP-30' },
  { name: 'machining-op-20', operation_name: 'MACHINING OP-20' },
  { name: 'machining-op-10', operation_name: 'MACHINING OP-10' },
  { name: 'powder-coating', operation_name: 'POWDER COATING' },
  { name: 'heat-treatment', operation_name: 'HEAT TREATMENT' },
  { name: 'shot-blasting', operation_name: 'Shot Blasting' },
  { name: 'core-preparation', operation_name: 'Core Preparation' },
  { name: 'assembly', operation_name: 'Assembly' },
  { name: 'water-leakage-testing', operation_name: 'Water Leakage Testing' },
  { name: 'fetting', operation_name: 'Fetting' },
  { name: 'final-inspection', operation_name: 'Final Inspection' },
  { name: 'machining', operation_name: 'Machining' },
  { name: 'gdc', operation_name: 'GDC' }
]

async function addOperations() {
  const pool = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  const conn = await pool.getConnection()

  try {
    console.log('Adding operations to the database...')
    
    for (const op of operations) {
      try {
        await conn.execute(
          'INSERT INTO operation (name, operation_name) VALUES (?, ?)',
          [op.name, op.operation_name]
        )
        console.log(`✓ Added operation: ${op.operation_name}`)
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`✓ Operation already exists: ${op.operation_name}`)
        } else {
          throw error
        }
      }
    }
    
    console.log('\nAll operations added successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error adding operations:', error)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

addOperations()
