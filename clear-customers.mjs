const API_BASE_URL = 'http://localhost:5001/api'

async function main() {
  try {
    console.log('🗑️  Clearing all customers from database...')
    const res = await fetch(
      `${API_BASE_URL}/selling/customers/truncate/all`,
      { method: 'DELETE' }
    )
    
    if (!res.ok) {
      const error = await res.text()
      console.error('❌ Error:', error)
      process.exit(1)
    }
    
    const data = await res.json()
    console.log('✅ ' + data.message)
    
    console.log('\n📊 Verifying customers list is empty...')
    const verifyRes = await fetch(`${API_BASE_URL}/selling/customers`)
    const verifyData = await verifyRes.json()
    console.log(`✅ Total customers: ${verifyData.data?.length || 0}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
