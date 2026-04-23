const BASE_URL = 'http://localhost:5000/api'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyIiwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3Njc5NjQ0MDYsImV4cCI6MTc2ODA1MDgwNn0.eNvkyyvHcD2SClwiQY7xkeX5O-22LTWt_5Rm5L2TNtc'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function test() {
  try {
    console.log('🧪 Testing Job Card to Work Order Status Update Flow\n')
    
    console.log('1️⃣ Fetching existing work orders...')
    const woRes = await fetch(`${BASE_URL}/production/work-orders`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    })
    const woData = await woRes.json()
    let workOrders = woData.data || []
    
    console.log(`Found ${workOrders.length} work orders`)
    
    if (workOrders.length === 0) {
      console.log('\n2️⃣ Creating a test work order...')
      const woCreateRes = await fetch(`${BASE_URL}/production/work-orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
          wo_id: `WO-TEST-${Date.now()}`,
          item_code: 'ITEM-001',
          quantity: 100,
          priority: 'high',
          status: 'planned'
        })
      })
      const woCreateData = await woCreateRes.json()
      
      if (!woCreateData.success) {
        console.log(`❌ Failed to create work order: ${woCreateData.message}`)
        return
      }
      
      workOrders = [woCreateData.data]
      console.log(`✅ Work order created: ${woCreateData.data.wo_id}`)
    }
    
    const workOrder = workOrders[0]
    console.log(`\n3️⃣ Using work order: ${workOrder.wo_id} (Status: ${workOrder.status})`)
    
    console.log('\n4️⃣ Fetching job cards for this work order...')
    const jcRes = await fetch(`${BASE_URL}/production/job-cards?work_order_id=${workOrder.wo_id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    })
    const jcData = await jcRes.json()
    let jobCards = jcData.data || []
    
    console.log(`Found ${jobCards.length} job cards`)
    
    if (jobCards.length === 0) {
      console.log('⚠️ No job cards found. Creating a test job card...')
      
      const jcCreateRes = await fetch(`${BASE_URL}/production/job-cards`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
          job_card_id: `JC-TEST-${Date.now()}`,
          work_order_id: workOrder.wo_id,
          operation: 'TEST-OP',
          planned_quantity: 100,
          status: 'draft'
        })
      })
      const jcCreateData = await jcCreateRes.json()
      
      if (!jcCreateData.success) {
        console.log(`❌ Failed to create job card: ${jcCreateData.message}`)
        return
      }
      
      jobCards = [jcCreateData.data]
      console.log(`✅ Job card created: ${jcCreateData.data.job_card_id}`)
    }
    
    const firstJobCard = jobCards[0]
    console.log(`\n5️⃣ First job card: ${firstJobCard.job_card_id} (Status: ${firstJobCard.status})`)
    
    console.log('\n6️⃣ Updating job card status to "in-progress"...')
    const updateRes = await fetch(`${BASE_URL}/production/job-cards/${firstJobCard.job_card_id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ status: 'in-progress' })
    })
    const updateData = await updateRes.json()
    
    if (updateData.success) {
      console.log('✅ Job card status updated to "in-progress"')
    } else {
      console.log(`❌ Failed to update job card: ${updateData.message}`)
      console.log(`Error: ${updateData.error}`)
      return
    }
    
    console.log('\n7️⃣ Checking work order status...')
    await sleep(500)
    
    const woCheckRes = await fetch(`${BASE_URL}/production/work-orders/${workOrder.wo_id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    })
    const woCheckData = await woCheckRes.json()
    const updatedWorkOrder = woCheckData.data
    
    console.log(`\n📋 RESULTS:`)
    console.log(`   Job Card Status: in-progress`)
    console.log(`   Work Order Status: ${updatedWorkOrder.status}`)
    
    if (updatedWorkOrder.status === 'in-progress') {
      console.log('\n✅ SUCCESS! Work order status is now "in-progress" when first job card is in-progress')
    } else {
      console.log(`\n⚠️ ISSUE: Work order status is "${updatedWorkOrder.status}" (expected "in-progress")`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.stack) console.error(error.stack)
  }
}

test()
