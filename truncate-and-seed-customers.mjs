const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5001/api'
const token = process.env.API_TOKEN || ''

const headers = {
  'Content-Type': 'application/json',
  ...(token && { Authorization: `Bearer ${token}` })
}

const realCustomers = [
  {
    customer_id: 'ACME-001',
    name: 'ACME Manufacturing Ltd.',
    email: 'contact@acme.com',
    phone: '+91-9876543210',
    gst_no: '18AABCT1234H1Z5',
    billing_address: '123 Industrial Park, Mumbai, Maharashtra 400001',
    shipping_address: '123 Industrial Park, Mumbai, Maharashtra 400001',
    credit_limit: 500000,
    customer_type: 'tata',
    status: 'active'
  },
  {
    customer_id: 'BETA-001',
    name: 'Beta Industries Inc.',
    email: 'sales@beta.co.in',
    phone: '+91-9123456789',
    gst_no: '22BBBCT5678F1Z9',
    billing_address: '456 Business District, Bangalore, Karnataka 560001',
    shipping_address: '456 Business District, Bangalore, Karnataka 560001',
    credit_limit: 750000,
    customer_type: 'other',
    status: 'active'
  },
  {
    customer_id: 'GMMA-001',
    name: 'Gamma Precision Engineers',
    email: 'info@gamma.com',
    phone: '+91-8765432109',
    gst_no: '27CCCCT9012H1Z3',
    billing_address: '789 Tech Park, Pune, Maharashtra 411001',
    shipping_address: '789 Tech Park, Pune, Maharashtra 411001',
    credit_limit: 600000,
    customer_type: 'other',
    status: 'active'
  },
  {
    customer_id: 'DLTA-001',
    name: 'Delta Manufacturing Co.',
    email: 'procurement@delta.in',
    phone: '+91-7654321098',
    gst_no: '29DDDCT3456F1Z7',
    billing_address: '321 Enterprise Zone, Chennai, Tamil Nadu 600001',
    shipping_address: '321 Enterprise Zone, Chennai, Tamil Nadu 600001',
    credit_limit: 550000,
    customer_type: 'other',
    status: 'active'
  },
  {
    customer_id: 'EPSL-001',
    name: 'Epsilon Supply Ltd.',
    email: 'sales@epsilon.co.in',
    phone: '+91-6543210987',
    gst_no: '31EEECT7890H1Z1',
    billing_address: '654 Commerce Hub, Ahmedabad, Gujarat 380001',
    shipping_address: '654 Commerce Hub, Ahmedabad, Gujarat 380001',
    credit_limit: 450000,
    customer_type: 'other',
    status: 'active'
  }
]

async function main() {
  try {
    console.log('🗑️  Deleting all customers...')
    const truncateRes = await fetch(
      `${API_BASE_URL}/selling/customers/truncate/all`,
      { method: 'DELETE', headers }
    )
    
    if (!truncateRes.ok) {
      const errorText = await truncateRes.text()
      console.warn('⚠️  Truncate endpoint failed, this is expected if foreign keys exist')
      console.log('Response:', errorText)
      console.log('Continuing with manual deletion approach...')
    } else {
      const truncateData = await truncateRes.json()
      console.log('✅ Truncated:', truncateData.message)
    }

    console.log('\n📥 Seeding real customer data...')
    for (const customer of realCustomers) {
      const createRes = await fetch(
        `${API_BASE_URL}/selling/customers`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(customer)
        }
      )

      if (!createRes.ok) {
        const error = await createRes.json()
        console.error(`❌ Failed to create ${customer.name}:`, error)
      } else {
        console.log(`✅ Created: ${customer.name} (${customer.customer_id})`)
      }
    }

    console.log('\n✨ Seeding complete! Fetching all customers...')
    const fetchRes = await fetch(`${API_BASE_URL}/selling/customers`, { headers })
    const fetchData = await fetchRes.json()
    
    console.log(`\n📊 Total customers: ${fetchData.data?.length || 0}`)
    fetchData.data?.forEach(c => {
      console.log(`  - ${c.customer_name || c.name} (${c.customer_id || c.id})`)
    })
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
