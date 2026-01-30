import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const API_BASE = 'http://localhost:5001/api';

async function test() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'erp_user',
    password: process.env.DB_PASSWORD || 'erp_password',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
  });

  try {
    console.log('🧪 Testing Sales Order Status Sync and Notifications\n');

    const testId = Date.now();
    const email = `test-${testId}@example.com`;
    const password = 'password123';

    console.log('1️⃣ Registering and logging in...');
    const registerRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        fullName: 'Test User',
        password,
        confirmPassword: password,
        department: 'manufacturing'
      })
    });

    const registerData = await registerRes.json();
    if (registerRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
    }

    const token = registerData.token;
    const userId = registerData.user.user_id;
    console.log(`✅ Logged in as ${email} (ID: ${userId})`);

    console.log('\n2️⃣ Creating test data...');
    const customerId = `CUST-${testId}`;
    const soId = `SO-TEST-${testId}`;
    const woId = `WO-TEST-${testId}`;
    const jcId = `JC-TEST-${testId}`;

    // Create Customer
    await connection.execute(
      'INSERT INTO selling_customer (customer_id, name, status) VALUES (?, ?, ?)',
      [customerId, 'Test Customer', 'active']
    );

    // Create Sales Order
    await connection.execute(
      `INSERT INTO selling_sales_order 
       (sales_order_id, customer_id, customer_name, status, created_by, delivery_date, order_amount) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [soId, customerId, 'Test Customer', 'confirmed', userId, '2025-12-31', 1000]
    );

    // Create Work Order
    await connection.execute(
      'INSERT INTO work_order (wo_id, sales_order_id, item_code, quantity, status) VALUES (?, ?, ?, ?, ?)',
      [woId, soId, 'ITEM-001', 10, 'draft']
    );

    // Create Job Card
    await connection.execute(
      'INSERT INTO job_card (job_card_id, work_order_id, operation, status) VALUES (?, ?, ?, ?)',
      [jcId, woId, 'Operation 1', 'Open']
    );

    console.log(`✅ Test data created: SO=${soId}, WO=${woId}, JC=${jcId}`);

    console.log('\n3️⃣ Updating Job Card status to "in-progress" via API...');
    const updateRes = await fetch(`${API_BASE}/production/job-cards/${jcId}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'in-progress' })
    });

    if (updateRes.status !== 200) {
      const errorData = await updateRes.json();
      throw new Error(`Job card update failed: ${JSON.stringify(errorData)}`);
    }

    console.log('✅ Job card updated to in-progress');

    console.log('\n4️⃣ Verifying Sales Order status transitioned to "production"...');
    const [soRows] = await connection.execute(
      'SELECT status FROM selling_sales_order WHERE sales_order_id = ?',
      [soId]
    );
    
    console.log(`Current SO Status: ${soRows[0].status}`);
    if (soRows[0].status === 'production') {
      console.log('✅ Sales Order status successfully transitioned to "production"');
    } else {
      console.error('❌ Sales Order status did not transition to "production"');
    }

    console.log('\n5️⃣ Verifying notification was created...');
    const [notifRows] = await connection.execute(
      'SELECT * FROM notification WHERE user_id = ? AND reference_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId, soId]
    );

    if (notifRows.length > 0) {
      console.log(`✅ Notification found: "${notifRows[0].title}"`);
      console.log(`Message: ${notifRows[0].message}`);
    } else {
      console.error('❌ Notification not found');
    }

    console.log('\n6️⃣ Updating Job Card status to "completed" via API...');
    const completeRes = await fetch(`${API_BASE}/production/job-cards/${jcId}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'completed' })
    });

    if (completeRes.status !== 200) {
      const errorData = await completeRes.json();
      throw new Error(`Job card completion failed: ${JSON.stringify(errorData)}`);
    }

    console.log('✅ Job card updated to completed');

    console.log('\n7️⃣ Verifying Sales Order status transitioned to "complete"...');
    const [soRowsFinal] = await connection.execute(
      'SELECT status FROM selling_sales_order WHERE sales_order_id = ?',
      [soId]
    );
    
    console.log(`Final SO Status: ${soRowsFinal[0].status}`);
    if (soRowsFinal[0].status === 'complete') {
      console.log('✅ Sales Order status successfully transitioned to "complete"');
    } else {
      console.error('❌ Sales Order status did not transition to "complete"');
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  } finally {
    await connection.end();
  }
}

test();
