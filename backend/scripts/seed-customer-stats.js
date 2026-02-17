
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
  });

  console.log('Connected to database');

  try {
    const customers = [
      { id: 'CUST-SEED-001', name: 'Global Tech Solutions', email: 'contact@globaltech.com', segment: 'Premium' },
      { id: 'CUST-SEED-002', name: 'Precision Motors', email: 'info@precisionmotors.com', segment: 'Premium' },
      { id: 'CUST-SEED-003', name: 'Smart Build Construction', email: 'sales@smartbuild.com', segment: 'Regular' },
      { id: 'CUST-SEED-004', name: 'Eco Energy Systems', email: 'hello@ecoenergy.io', segment: 'Regular' },
      { id: 'CUST-SEED-005', name: 'Nexus Aerospace', email: 'ops@nexusaero.com', segment: 'Premium' },
      { id: 'CUST-SEED-006', name: 'Apex Logistics', email: 'support@apex.com', segment: 'Regular' },
      { id: 'CUST-SEED-007', name: 'Horizon Dynamics', email: 'info@horizon.com', segment: 'Regular' },
      { id: 'CUST-SEED-008', name: 'Zenith Manufacturing', email: 'factory@zenith.com', segment: 'Regular' }
    ];

    console.log('Seeding customers...');
    for (const customer of customers) {
      await connection.query(
        `INSERT INTO selling_customer (customer_id, name, email, phone, status, created_at) 
         VALUES (?, ?, ?, ?, 'active', DATE_SUB(NOW(), INTERVAL 7 MONTH))
         ON DUPLICATE KEY UPDATE name=VALUES(name), status='active'`,
        [customer.id, customer.name, customer.email, '1234567890']
      );
    }

    console.log('Seeding sales orders...');
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const monthStr = monthDate.toISOString().slice(0, 19).replace('T', ' ');

      // Premium customer orders
      for (const cust of customers.filter(c => c.segment === 'Premium')) {
          const amount = 50000 + Math.random() * 100000;
          await connection.query(
            `INSERT INTO selling_sales_order (sales_order_id, customer_id, customer_name, order_amount, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [`SO-SEED-${cust.id.slice(-3)}-${i}`, cust.id, cust.name, amount, 'confirmed', monthStr]
          );
      }

      // Regular customer orders (fewer and smaller)
      for (const cust of customers.filter(c => c.segment === 'Regular')) {
          if (Math.random() > 0.4) {
            const amount = 5000 + Math.random() * 20000;
            await connection.query(
                `INSERT INTO selling_sales_order (sales_order_id, customer_id, customer_name, order_amount, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [`SO-SEED-${cust.id.slice(-3)}-${i}`, cust.id, cust.name, amount, 'confirmed', monthStr]
            );
          }
      }
    }

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await connection.end();
  }
}

seed();
