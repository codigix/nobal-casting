import { createPool } from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

async function setupSellingModule() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aluminium_erp',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })

  try {
    console.log('🔧 Setting up Selling Module tables...')

    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), 'scripts', 'create_selling_schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    for (const statement of statements) {
      try {
        await db.execute(statement)
        console.log('✓ Executed:', statement.substring(0, 50) + '...')
      } catch (error) {
        console.error('✗ Error executing statement:', error.message)
      }
    }

    console.log('✅ Selling Module setup completed successfully!')
    console.log('\n📋 Created tables:')
    console.log('   - selling_customer')
    console.log('   - selling_quotation')
    console.log('   - selling_sales_order')
    console.log('   - selling_delivery_note')
    console.log('   - selling_invoice')

    await db.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error setting up selling module:', error)
    process.exit(1)
  }
}

setupSellingModule()