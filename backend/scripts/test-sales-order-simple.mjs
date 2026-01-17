import http from 'http';

const payload = {
  customer_id: 'CUST-ACME-001',
  customer_name: 'ACME Manufacturing Ltd.',
  total_value: 50000,
  delivery_date: '2026-02-15',
  terms_conditions: 'Test order',
  bom_id: 'BOM-1768203193760',
  items: []
};

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/selling/sales-orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(JSON.stringify(payload));
req.end();
