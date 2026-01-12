const BASE_URL = 'http://localhost:5001/api'

async function test() {
  try {
    console.log('🧪 Testing Job Card to Work Order Status Update\n')
    
    console.log('1️⃣ Fetching work orders...')
    const woRes = await fetch(`${BASE_URL}/production/work-orders`)
    const woData = await woRes.json()
    const workOrders = woData.data || []
    
    if (workOrders.length === 0) {
      console.log('❌ No work orders found. Please create some work orders first.')
      return
    }
    
    const workOrder = workOrders[0]
    console.log(`✅ Found work order: ${workOrder.wo_id} (Status: ${workOrder.status})`)
    
    console.log('\n2️⃣ Fetching job cards for this work order...')
    const jcRes = await fetch(`${BASE_URL}/production/job-cards?work_order_id=${workOrder.wo_id}`)
    const jcData = await jcRes.json()
    const jobCards = jcData.data || []
    
    if (jobCards.length === 0) {
      console.log('❌ No job cards found for this work order.')
      return
    }
    
    const firstJobCard = jobCards[0]
    console.log(`✅ Found job card: ${firstJobCard.job_card_id} (Status: ${firstJobCard.status})`)
    
    console.log('\n3️⃣ Updating first job card to "in-progress"...')
    const updateRes = await fetch(`${BASE_URL}/production/job-cards/${firstJobCard.job_card_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'in-progress' })
    })
    const updateData = await updateRes.json()
    
    if (updateData.success) {
      console.log('✅ Job card updated successfully')
    } else {
      console.log(`❌ Failed to update job card: ${updateData.message}`)
      return
    }
    
    console.log('\n4️⃣ Checking work order status after job card update...')
    await new Promise(r => setTimeout(r, 500))
    
    const woCheckRes = await fetch(`${BASE_URL}/production/work-orders/${workOrder.wo_id}`)
    const woCheckData = await woCheckRes.json()
    const updatedWorkOrder = woCheckData.data
    
    console.log(`📋 Work Order Status: ${updatedWorkOrder.status}`)
    
    if (updatedWorkOrder.status === 'in-progress') {
      console.log('✅ SUCCESS! Work order status is now "in-progress"')
    } else {
      console.log(`⚠️ Work order status is "${updatedWorkOrder.status}" (expected "in-progress")`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

test()
