import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function checkTriggers() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [triggers] = await conn.query('SHOW TRIGGERS');
    triggers.forEach(t => {
        console.log(`Trigger: ${t.Trigger}`);
        console.log(`Event: ${t.Event}`);
        console.log(`Table: ${t.Table}`);
        console.log(`Statement: ${t.Statement}`);
        console.log('---');
    });
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

checkTriggers();
