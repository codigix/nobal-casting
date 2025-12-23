import http from 'http'

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/masters/sales-orders-analysis',
  method: 'GET'
}

const req = http.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => {
    data += chunk
  })
  res.on('end', () => {
    console.log('Response status:', res.statusCode)
    console.log('Response data:', data)
    try {
      const parsed = JSON.parse(data)
      console.log('\nParsed JSON:')
      console.log('- Success:', parsed.success)
      console.log('- Total:', parsed.data?.total)
      console.log('- StatusCounts:', parsed.data?.statusCounts)
      console.log('- Projects:', parsed.data?.projects?.length)
      console.log('- Timeline:', parsed.data?.monthlyTimeline?.length)
      console.log('- Message:', parsed.message)
    } catch (e) {
      console.log('Failed to parse JSON')
    }
    process.exit(0)
  })
})

req.on('error', (e) => {
  console.error('Error:', e.message)
  process.exit(1)
})

req.end()
