const BASE_URL = 'http://localhost:5001/api'

async function test() {
  try {
    console.log('Testing API connectivity...\n')
    
    console.log('1️⃣ Testing GET /production/work-orders')
    const woRes = await fetch(`${BASE_URL}/production/work-orders`)
    console.log(`Status: ${woRes.status}`)
    const woData = await woRes.json()
    console.log('Response:', JSON.stringify(woData, null, 2).substring(0, 500))
    
    console.log('\n2️⃣ Testing POST /production/work-orders')
    const woCreateRes = await fetch(`${BASE_URL}/production/work-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wo_id: `WO-TEST-${Date.now()}`,
        item_code: 'ITEM-001',
        quantity: 100,
        priority: 'high',
        status: 'planned'
      })
    })
    console.log(`Status: ${woCreateRes.status}`)
    const woCreateData = await woCreateRes.json()
    console.log('Response:', JSON.stringify(woCreateData, null, 2).substring(0, 500))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

test()
