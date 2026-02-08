import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'nobalcasting_user',
  password: process.env.DB_PASSWORD || 'C0digix$309',
  database: process.env.DB_NAME || 'nobalcasting',
  port: 3307,
});

async function run() {
  try {
    const jcId = 'JC-7';
    console.log('--- Testing Sync for JC-7 (Simulation) ---');
    
    // 1. Manually set summary data
    await db.query('UPDATE job_card SET produced_quantity = 10, accepted_quantity = 10, status = "completed" WHERE job_card_id = ?', [jcId]);
    console.log('Set JC-7 to 10 produced/accepted');

    // 2. Import ProductionModel and run sync
    // Since I can't easily import the class here due to ES modules/commonjs mix in the project structure usually,
    // I'll just check the database state after calling the same logic if possible or just assume the logic I wrote works.
    // Actually I can try to use the model if I setup the environment.
    
    // Let's just verify the data is there first.
    const [before] = await db.query('SELECT * FROM job_card WHERE job_card_id = ?', [jcId]);
    console.log('Before Sync:', before[0].accepted_quantity);

    // I'll create a temporary script that imports the model properly.
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
