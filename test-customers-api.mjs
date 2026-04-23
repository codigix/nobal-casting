const res = await fetch('http://localhost:5000/api/selling/customers')
const data = await res.json()
console.log('API Response:', JSON.stringify(data, null, 2))
