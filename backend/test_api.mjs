import fetch from 'node-fetch';

async function test() {
  try {
    const response = await fetch('http://localhost:5000/api/machines/1/historical-metrics');
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch(err) {
    console.error('Error:', err.message);
  }
}

test();
