import fetch from 'node-fetch';

const payload = {
  customer_id: 'CUST-ACME-001',
  customer_name: 'ACME Manufacturing Ltd.',
  total_value: 50000,
  delivery_date: '2026-02-15',
  terms_conditions: 'Test order'
};

const res = await fetch('http://localhost:5001/api/selling/sales-orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(data, null, 2));
