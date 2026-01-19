const API = 'http://localhost:5001/api'

async function testCompleteFlow() {
  try {
    console.log('🧪 Testing Complete Customer Flow\n')

    // Step 1: Check initial state
    console.log('1️⃣  Checking initial customers...')
    let res = await fetch(`${API}/selling/customers`)
    let data = await res.json()
    console.log(`   Initial customers: ${data.data.length}`)

    // Step 2: Create a test customer
    console.log('\n2️⃣  Creating test customer...')
    const testCustomer = {
      customer_id: `TEST-${Date.now()}`,
      name: `Test Customer ${Date.now()}`,
      email: 'test@example.com',
      phone: '+91-9876543210',
      gst_no: '22ABCDE1234F1Z5',
      billing_address: '123 Test Street',
      shipping_address: '123 Test Street',
      credit_limit: 100000,
      status: 'active'
    }

    res = await fetch(`${API}/selling/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCustomer)
    })
    data = await res.json()
    
    if (!res.ok) {
      console.error('   ❌ Failed to create customer:', data)
      process.exit(1)
    }
    console.log(`   ✅ Customer created: ${testCustomer.name}`)

    // Step 3: Wait a second
    console.log('\n3️⃣  Waiting 1 second...')
    await new Promise(r => setTimeout(r, 1000))

    // Step 4: Fetch customers
    console.log('\n4️⃣  Fetching all customers...')
    res = await fetch(`${API}/selling/customers`)
    data = await res.json()
    console.log(`   ✅ Total customers: ${data.data.length}`)
    data.data.forEach(c => {
      console.log(`      - ${c.customer_name} (${c.customer_id})`)
    })

    // Step 5: Verify the new customer is there
    const found = data.data.find(c => c.customer_id === testCustomer.customer_id)
    if (found) {
      console.log('\n✨ SUCCESS! New customer appears in API response')
      console.log(`   Customer: ${found.customer_name}`)
      console.log(`   Email: ${found.email}`)
      console.log(`   Phone: ${found.phone}`)
    } else {
      console.log('\n❌ FAILED! Customer created but not found in API response')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testCompleteFlow()
