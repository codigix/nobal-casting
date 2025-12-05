import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'aluminium_erp',
  port: process.env.DB_PORT || 3306
})

async function createCompanyTable() {
  try {
    const connection = await pool.getConnection()

    console.log('Creating company table...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS company (
        company_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        country VARCHAR(100),
        currency VARCHAR(10) DEFAULT 'INR',
        fiscal_year_start DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✓ Company table created successfully')

    console.log('Checking if company data exists...')
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM company')
    
    if (rows[0].count === 0) {
      console.log('Inserting sample company data...')
      await connection.execute(`
        INSERT INTO company (company_id, name, display_name, country, currency, fiscal_year_start)
        VALUES ('COMP001', 'Aluminium Precision Casting', 'APC', 'India', 'INR', '2024-04-01')
      `)
      console.log('✓ Sample company data inserted')
    } else {
      console.log('✓ Company data already exists')
    }

    connection.release()
    pool.end()
    console.log('\n✓ Migration completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    pool.end()
    process.exit(1)
  }
}

createCompanyTable()
