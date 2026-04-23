const BASE_URL = 'http://localhost:5000/api'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyIiwidXNlcm5hbWUiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3Njc5NjQ0MDYsImV4cCI6MTc2ODA1MDgwNn0.eNvkyyvHcD2SClwiQY7xkeX5O-22LTWt_5Rm5L2TNtc'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function test() {
  try {
    console.log('🧪 Testing Job Card to Work Order Status Update Flow\n')
    
    console.log('1️⃣ Creating a new test work order with a fresh job card...')
    const woCreateRes = await fetch(`${BASE_URL}/production/work-orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        wo_id: `WO-NEW-${Date.now()}`,
        item_code: 'ITEM-NEW-001',
        quantity: 50,
        priority: 'medium',
        status: 'draft'
      })
    })
    const woCreateData = await woCreateRes.json()
    
    if (!woCreateData.success) {
      console.log(`❌ Failed to create work order: ${woCreateData.message}`)
      return
    }
    
    const workOrder = woCreateData.data
    console.log(`✅ Work order created: ${workOrder.wo_id} (Status: ${workOrder.status})`)
    
    console.log('\n2️⃣ Creating a test job card...')
    const jcCreateRes = await fetch(`${BASE_URL}/production/job-cards`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        work_order_id: workOrder.wo_id,
        machine_id: 'MACHINE-001',
        operator_id: 'OP-001',
        operation: 'ASSEMBLY',
        operation_sequence: 1,
        planned_quantity: 50,
        status: 'draft'
      })
    })
    const jcCreateData = await jcCreateRes.json()
    
    if (!jcCreateData.success) {
      console.log(`❌ Failed to create job card: ${jcCreateData.message}`)
      return
    }
    
    const jobCard = jcCreateData.data
    console.log(`✅ Job card created: ${jobCard.job_card_id} (Status: ${jobCard.status})`)
    
    console.log('\n3️⃣ Current state before update:')
    console.log(`   Work Order: ${workOrder.wo_id} (Status: ${workOrder.status})`)
    console.log(`   Job Card: ${jobCard.job_card_id} (Status: ${jobCard.status})`)
    
    console.log('\n4️⃣ Updating job card directly to "in-progress"...')
    
    let updateRes = await fetch(`${BASE_URL}/production/job-cards/${jobCard.job_card_id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ status: 'in-progress' })
    })
    let updateData = await updateRes.json()
    
    if (!updateData.success) {
      console.log(`   ❌ Failed: ${updateData.message}`)
      console.log(`   Error details: ${updateData.error}`)
      
      console.log('\n   Trying workflow: draft → pending → in-progress')
      
      console.log('   Step 1: draft → pending')
      updateRes = await fetch(`${BASE_URL}/production/job-cards/${jobCard.job_card_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({ status: 'pending' })
      })
      updateData = await updateRes.json()
      
      if (!updateData.success) {
        console.log(`      ❌ Failed: ${updateData.message}`)
        return
      }
      console.log(`      ✅ Job card now "pending"`)
      
      await sleep(100)
      
      console.log('   Step 2: pending → in-progress')
      updateRes = await fetch(`${BASE_URL}/production/job-cards/${jobCard.job_card_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({ status: 'in-progress' })
      })
      updateData = await updateRes.json()
      
      if (!updateData.success) {
        console.log(`      ❌ Failed: ${updateData.message}`)
        console.log(`      Error details: ${updateData.error}`)
        return
      }
    }
    
    console.log(`   ✅ Job card now "in-progress"`)
    
    console.log('\n5️⃣ Checking work order status after job card transition...')
    await sleep(500)
    
    const woCheckRes = await fetch(`${BASE_URL}/production/work-orders/${workOrder.wo_id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    })
    const woCheckData = await woCheckRes.json()
    const updatedWorkOrder = woCheckData.data
    
    console.log(`\n📋 FINAL STATE:`)
    console.log(`   Job Card Status: in-progress`)
    console.log(`   Work Order Status: ${updatedWorkOrder.status}`)
    
    if (updatedWorkOrder.status === 'in-progress') {
      console.log('\n✅ SUCCESS! Work order status automatically updated to "in-progress"')
      console.log('   when the first job card transitioned to "in-progress"!')
    } else {
      console.log(`\n⚠️ Work order status is "${updatedWorkOrder.status}" (expected "in-progress")`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.stack) console.error(error.stack)
  }
}

test()
