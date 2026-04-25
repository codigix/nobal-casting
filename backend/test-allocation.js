import mysql from 'mysql2/promise';
import ProductionModel from './src/models/ProductionModel.js';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3307')
};

async function test() {
  const connection = await mysql.createConnection(dbConfig);
  const productionModel = new ProductionModel(connection);

  console.log('--- Fetching existing jobs ---');
  const [jobs] = await connection.query('SELECT job_card_id, machine_id, operator_id, scheduled_start_date, scheduled_end_date, status FROM job_card WHERE scheduled_start_date IS NOT NULL LIMIT 5');
  console.log(JSON.stringify(jobs, null, 2));

  if (jobs.length > 0) {
    const firstJob = jobs[0];
    console.log('--- Testing validateAllocation with intentional conflict ---');
    const testData = {
      machine_id: firstJob.machine_id,
      operator_id: firstJob.operator_id,
      scheduled_start_date: firstJob.scheduled_start_date,
      scheduled_end_date: firstJob.scheduled_end_date
    };
    
    console.log('Test data:', JSON.stringify(testData, null, 2));

    try {
      await productionModel.validateAllocation(testData);
      console.log('FAILED: No conflict found, but should have!');
    } catch (error) {
      if (error.name === 'ConflictError') {
        console.log('SUCCESS: Conflict detected correctly:');
        console.log(JSON.stringify(error.details, null, 2));
      } else {
        console.error('Unexpected error:', error);
      }
    }
  } else {
    console.log('No jobs with schedule found in DB');
  }

  await connection.end();
}

test().catch(console.error);
