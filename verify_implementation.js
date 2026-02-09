const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function verify() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'nobalcasting'
    });

    console.log('Connected to database');

    const so_id = `TEST-SO-${Date.now()}`;
    const wo_id = `TEST-WO-${Date.now()}`;
    const jc_id = `TEST-JC-${Date.now()}`;

    // 1. Create a Test Sales Order
    console.log('Creating Test Sales Order...');
    await connection.execute(
      "INSERT INTO selling_sales_order (sales_order_id, customer_id, order_amount, status) VALUES (?, ?, ?, ?)",
      [so_id, 'CUST-001', 1000, 'confirmed']
    );

    // 2. Create a Test Work Order
    console.log('Creating Test Work Order...');
    await connection.execute(
      "INSERT INTO work_order (wo_id, sales_order_id, status) VALUES (?, ?, ?)",
      [wo_id, so_id, 'draft']
    );

    // 3. Create a Test Job Card
    console.log('Creating Test Job Card...');
    await connection.execute(
      "INSERT INTO job_card (job_card_id, work_order_id, status, operation_sequence) VALUES (?, ?, ?, ?)",
      [jc_id, wo_id, 'draft', 1]
    );

    // 4. Update Job Card Status using ProductionModel logic (simulated)
    // We'll import the ProductionModel to use its logic
    console.log('Importing ProductionModel...');
    const ProductionModel = require('./backend/src/models/ProductionModel.js').default;
    const productionModel = new ProductionModel(connection);

    console.log('Updating Job Card Status to in-progress...');
    await productionModel.updateJobCardStatus(jc_id, 'in-progress');

    // 5. Verify Sales Order Status
    console.log('Verifying Sales Order Status...');
    const [soRows] = await connection.execute(
      "SELECT status FROM selling_sales_order WHERE sales_order_id = ?",
      [so_id]
    );

    console.log('Sales Order Status:', soRows[0].status);

    if (soRows[0].status === 'production') {
      console.log('SUCCESS: Sales Order status correctly transitioned to "production"');
    } else {
      console.error('FAILURE: Sales Order status is', soRows[0].status, 'expected "production"');
    }

    // Cleanup
    console.log('Cleaning up...');
    await connection.execute("DELETE FROM job_card WHERE job_card_id = ?", [jc_id]);
    await connection.execute("DELETE FROM work_order WHERE wo_id = ?", [wo_id]);
    await connection.execute("DELETE FROM selling_sales_order WHERE sales_order_id = ?", [so_id]);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    if (connection) await connection.end();
  }
}

verify();
