import axios from 'axios';
const client = axios.create({
  baseURL: 'http://localhost:5001',
  validateStatus: () => true
});

async function run() {
  try {
    const res = await client.get('/api/items?limit=1');
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data).substring(0, 100));
  } catch (err) {
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
  }
}

run();
