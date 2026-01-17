import mysql from 'mysql2/promise'

const config = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
}

async function seedTestCustomers() {
  let connection
  try {
    connection = await mysql.createConnection(config)
    
    const testCustomers = [
      {
        customer_id: 'CUST-ACME-001',
        name: 'ACME Manufacturing Ltd.',
        email: 'orders@acme.com',
        phone: '+91-9876543210',
        gstin: '27AABCT1234H1Z0',
        billing_address: '123 Industrial Area, Mumbai',
        shipping_address: '456 Warehouse Street, Mumbai',
        credit_limit: 500000,
        status: 'active'
      },
      {
        customer_id: 'CUST-BETA-002',
        name: 'Beta Industries Inc.',
        email: 'sales@beta.com',
        phone: '+91-8765432109',
        gstin: '29AABCT5678H1Z0',
        billing_address: '789 Tech Park, Bangalore',
        shipping_address: '321 Factory Complex, Bangalore',
        credit_limit: 750000,
        status: 'active'
      },
      {
        customer_id: 'CUST-GAMMA-003',
        name: 'Gamma Precision Engineers',
        email: 'contact@gamma.com',
        phone: '+91-7654321098',
        gstin: '33AABCT9012H1Z0',
        billing_address: '555 Business Hub, Pune',
        shipping_address: '777 Distribution Center, Pune',
        credit_limit: 600000,
        status: 'active'
      }
    ]

    console.log('Seeding test customers...')
    
    for (const customer of testCustomers) {
      try {
        await connection.execute(
          `INSERT INTO selling_customer 
           (customer_id, name, email, phone, gstin, billing_address, shipping_address, credit_limit, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            customer.customer_id,
            customer.name,
            customer.email,
            customer.phone,
            customer.gstin,
            customer.billing_address,
            customer.shipping_address,
            customer.credit_limit,
            customer.status
          ]
        )
        console.log(`✅ Created customer: ${customer.name} (${customer.customer_id})`)
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Customer already exists: ${customer.customer_id}`)
        } else {
          console.error(`❌ Failed to create customer ${customer.name}:`, err.message)
        }
      }
    }

    console.log('\n✅ Test customers seeding completed!')
    
    // Verify the data
    const [customers] = await connection.execute(
      'SELECT customer_id, name, email, phone, status FROM selling_customer WHERE status = ?',
      ['active']
    )
    console.log(`\nTotal active customers in database: ${customers.length}`)
    customers.forEach(c => {
      console.log(`  - ${c.name} (${c.customer_id})`)
    })

  } catch (err) {
    console.error('Error seeding customers:', err.message)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

seedTestCustomers()
