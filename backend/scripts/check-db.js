import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function checkDatabase() {
  try {
    console.log('Database Configuration:')
    console.log('  Host:', process.env.DB_HOST)
    console.log('  User:', process.env.DB_USER)
    console.log('  Database:', process.env.DB_NAME)
    console.log('  Port:', process.env.DB_PORT)

    const db = createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'aluminium_erp',
      port: process.env.DB_PORT || 3306
    })

    const connection = await db.getConnection()
    console.log('\n✓ Database connection successful')

    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [process.env.DB_NAME]
    )

    console.log('\nTables found:')
    const grnTables = tables.filter(t => t.TABLE_NAME.includes('grn'))
    
    if (grnTables.length > 0) {
      grnTables.forEach(t => console.log('  ✓', t.TABLE_NAME))
    } else {
      console.log('  ✗ No GRN tables found')
    }

    if (tables.length < 10) {
      console.log('\nAll tables:')
      tables.forEach(t => console.log('  -', t.TABLE_NAME))
    }

    connection.release()
    await db.end()
  } catch (error) {
    console.error('✗ Error:', error.message)
    process.exit(1)
  }
}

checkDatabase()
