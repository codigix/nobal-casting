import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3306')
  });

  try {
    console.log('Seeding financial data...');

    // 1. Clear existing data
    await connection.query('DELETE FROM customer_payment');
    await connection.query('DELETE FROM vendor_payment');
    await connection.query('DELETE FROM expense_master');

    const now = new Date();
    
    // 2. Seed Customer Payments (Revenue)
    console.log('Seeding customer payments...');
    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setDate(now.getDate() - Math.floor(Math.random() * 30));
      const amount = 50000 + Math.random() * 150000;
      const status = Math.random() > 0.2 ? 'received' : 'pending';
      const id = `CPAY-${Date.now()}-${i}`;
      
      await connection.query(
        'INSERT INTO customer_payment (payment_id, customer_id, payment_date, amount, status, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
        [id, `CUST-00${(i % 3) + 1}`, date, amount, status, 'transfer']
      );
    }

    // 3. Seed Vendor Payments (Payables)
    console.log('Seeding vendor payments...');
    for (let i = 0; i < 15; i++) {
      const date = new Date();
      date.setDate(now.getDate() - Math.floor(Math.random() * 30));
      const amount = 30000 + Math.random() * 80000;
      const status = Math.random() > 0.3 ? 'paid' : 'pending';
      const id = `VPAY-${Date.now()}-${i}`;
      
      await connection.query(
        'INSERT INTO vendor_payment (payment_id, vendor_id, payment_date, amount, status, payment_method) VALUES (?, ?, ?, ?, ?, ?)',
        [id, `SUPP-00${(i % 3) + 1}`, date, amount, status, 'transfer']
      );
    }

    // 4. Seed Expenses
    console.log('Seeding expenses...');
    const categories = ['Utilities', 'Labor', 'Maintenance', 'Rent', 'Travel', 'Other'];
    const departments = ['Production', 'Admin', 'Sales', 'Inventory'];
    
    for (let i = 0; i < 25; i++) {
      const date = new Date();
      date.setDate(now.getDate() - Math.floor(Math.random() * 30));
      const amount = 5000 + Math.random() * 25000;
      const category = categories[Math.floor(Math.random() * categories.length)];
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const status = 'paid';
      const id = `EXP-${Date.now()}-${i}`;
      
      await connection.query(
        'INSERT INTO expense_master (expense_id, expense_date, category, amount, department, status, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, date, category, amount, dept, status, 'transfer']
      );
    }

    console.log('✓ Financial data seeded successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await connection.end();
  }
}

seed();
