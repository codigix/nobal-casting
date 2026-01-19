const res = await fetch('http://localhost:5001/api/selling/customers')
const data = await res.json()
console.log('API Response:', JSON.stringify(data, null, 2))
