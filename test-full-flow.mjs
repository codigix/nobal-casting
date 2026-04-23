const BASE_URL = 'http://localhost:5000/api'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function test() {
  try {
    console.log('🧪 Testing Job Card to Work Order Status Update Flow\n')
    
    console.log('1️⃣ Creating a test work order...')
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
    const woCreateData = await woCreateRes.json()
    
    if (!woCreateData.success) {
      console.log(`❌ Failed to create work order: ${woCreateData.message}`)
      return
    }
    
    const workOrderId = woCreateData.data.wo_id
    console.log(`✅ Work order created: ${workOrderId}`)
    
    console.log('\n2️⃣ Fetching work orders to confirm creation...')
    const woRes = await fetch(`${BASE_URL}/production/work-orders`)
    const woData = await woRes.json()
    const workOrders = woData.data || []
    
    if (workOrders.length === 0) {
      console.log('❌ No work orders found after creation.')
      return
    }
    
    const workOrder = workOrders.find(w => w.wo_id === workOrderId) || workOrders[0]
    console.log(`✅ Found work order: ${workOrder.wo_id} (Status: ${workOrder.status})`)
    
    console.log('\n3️⃣ Fetching job cards for this work order...')
    const jcRes = await fetch(`${BASE_URL}/production/job-cards?work_order_id=${workOrder.wo_id}`)
    const jcData = await jcRes.json()
    let jobCards = jcData.data || []
    
    if (jobCards.length === 0) {
      console.log('⚠️ No job cards found. Generating job cards...')
      
      const generateRes = await fetch(`${BASE_URL}/production/job-cards/${workOrder.wo_id}/generate-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const generateData = await generateRes.json()
      
      if (!generateData.success) {
        console.log(`⚠️ Could not auto-generate job cards: ${generateData.message}`)
        console.log('Creating manual job card instead...')
        
        const jcCreateRes = await fetch(`${BASE_URL}/production/job-cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      } else {
        jobCards = generateData.data || []
      }
      
      console.log(`✅ Generated/Created job cards`)
    }
    
    if (jobCards.length === 0) {
      console.log('❌ Still no job cards available.')
      return
    }
    
    const firstJobCard = jobCards[0]
    console.log(`✅ Found job card: ${firstJobCard.job_card_id} (Status: ${firstJobCard.status})`)
    
    console.log('\n4️⃣ Updating first job card to "in-progress"...')
    const updateRes = await fetch(`${BASE_URL}/production/job-cards/${firstJobCard.job_card_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in-progress' })
    })
    const updateData = await updateRes.json()
    
    if (updateData.success) {
      console.log('✅ Job card updated successfully')
    } else {
      console.log(`❌ Failed to update job card: ${updateData.message}`)
      return
    }
    
    console.log('\n5️⃣ Checking work order status after job card update...')
    await sleep(500)
    
    const woCheckRes = await fetch(`${BASE_URL}/production/work-orders/${workOrder.wo_id}`)
    const woCheckData = await woCheckRes.json()
    const updatedWorkOrder = woCheckData.data
    
    console.log(`📋 Work Order Status: ${updatedWorkOrder.status}`)
    
    if (updatedWorkOrder.status === 'in-progress') {
      console.log('\n✅ SUCCESS! Work order status is now "in-progress" when first job card is in-progress')
    } else {
      console.log(`\n⚠️ Work order status is "${updatedWorkOrder.status}" (expected "in-progress")`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  }
}

test()
