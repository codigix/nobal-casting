import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function updateCustomerEmails() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'nobalcasting',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔄 Updating customer emails and phone numbers...')

    const [customers] = await connection.execute(
      'SELECT customer_id, name FROM customer WHERE deleted_at IS NULL'
    )

    for (const customer of customers) {
      const email = `${customer.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
      const phone = `91${Math.floor(Math.random() * 9000000000 + 1000000000)}`

      await connection.execute(
        'UPDATE customer SET email = ?, phone = ? WHERE customer_id = ?',
        [email, phone, customer.customer_id]
      )
      console.log(`✓ Updated ${customer.name}: ${email}, ${phone}`)
    }

    console.log('✓ All customers updated successfully!')
  } catch (error) {
    console.error('❌ Error updating customers:', error.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

updateCustomerEmails()
