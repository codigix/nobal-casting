import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function fixForeignKey() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'nobalcasting',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔄 Fixing foreign key constraints...')

    await connection.execute(
      `ALTER TABLE selling_sales_order DROP FOREIGN KEY selling_sales_order_ibfk_1`
    )
    console.log('✓ Dropped old foreign key constraint')

    await connection.execute(
      `ALTER TABLE selling_sales_order ADD CONSTRAINT selling_sales_order_ibfk_1 FOREIGN KEY (customer_id) REFERENCES customer(customer_id)`
    )
    console.log('✓ Added new foreign key constraint to customer table')

    await connection.execute(
      `ALTER TABLE selling_quotation DROP FOREIGN KEY selling_quotation_ibfk_1`
    )
    console.log('✓ Dropped old quotation foreign key constraint')

    await connection.execute(
      `ALTER TABLE selling_quotation ADD CONSTRAINT selling_quotation_ibfk_1 FOREIGN KEY (customer_id) REFERENCES customer(customer_id)`
    )
    console.log('✓ Added new quotation foreign key constraint to customer table')

    console.log('✓ Foreign key constraints fixed successfully!')
  } catch (error) {
    console.error('❌ Error fixing foreign keys:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

fixForeignKey()
