import mysql from 'mysql2/promise';

async function check() {
  try {
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'nobalcasting_user',
      password: 'C0digix$309',
      database: 'nobalcasting',
      port: 3307
    });
    const [w] = await db.query('SELECT COUNT(*) as count FROM workstation');
    const [pe] = await db.query('SELECT COUNT(*) as count FROM production_entry');
    const [de] = await db.query('SELECT COUNT(*) as count FROM downtime_entry');
    console.log(JSON.stringify({
      workstations: w[0].count,
      production_entries: pe[0].count,
      downtime_entries: de[0].count
    }));
    await db.end();
  } catch (err) {
    console.error(err);
  }
}

check();
