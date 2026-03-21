import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = createPool({
  host: '127.0.0.1',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307,
});

async function run() {
  try {
    // 1. Get all customers from 'customer' table
    const [oldCustomers] = await db.query('SELECT * FROM customer');
    console.log(`Found ${oldCustomers.length} customers in 'customer' table.`);

    for (const c of oldCustomers) {
      // Check if already exists in selling_customer
      const [existing] = await db.query('SELECT customer_id FROM selling_customer WHERE customer_id = ?', [c.customer_id]);
      
      if (existing.length === 0) {
        console.log(`Migrating ${c.name} (${c.customer_id})...`);
        
        await db.query(
          `INSERT INTO selling_customer 
           (customer_id, name, customer_type, email, phone, gstin, billing_address, shipping_address, credit_limit, status, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.customer_id,
            c.name,
            c.customer_type || 'other',
            c.email || null,
            c.phone || null,
            c.gstin || null,
            c.address || null, // Mapping 'address' to 'billing_address'
            c.address || null, // Mapping 'address' to 'shipping_address'
            c.credit_limit || 0,
            c.is_active ? 'active' : 'inactive',
            c.created_at,
            c.updated_at,
            c.deleted_at
          ]
        );
      } else {
        console.log(`Skipping ${c.name} (${c.customer_id}) - already exists.`);
        
        // Update customer_type if it was changed
        if (c.customer_type) {
           await db.query('UPDATE selling_customer SET customer_type = ? WHERE customer_id = ?', [c.customer_type, c.customer_id]);
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    process.exit();
  }
}
run();