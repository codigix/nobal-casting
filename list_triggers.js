
import { createPool } from 'mysql2/promise';

const db = createPool({
  host: 'localhost',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307
});

async function listTriggers() {
  try {
    const [triggers] = await db.query('SHOW TRIGGERS');
    console.log('Triggers:', JSON.stringify(triggers, null, 2));
    
    for (const trigger of triggers) {
        const [triggerInfo] = await db.query(`SHOW CREATE TRIGGER ${trigger.Trigger}`);
        console.log(`Trigger ${trigger.Trigger}:`, triggerInfo[0]['SQL Original Statement']);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listTriggers();
