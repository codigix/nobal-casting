import mysql from 'mysql2/promise';

async function check() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'nobalcasting',
      port: 3306
    });

    const [wo] = await db.query('SELECT * FROM work_order LIMIT 1');
    console.log('Work orders sample:', JSON.stringify(wo, null, 2));

    const [ws] = await db.query('SELECT * FROM workstation LIMIT 1');
    console.log('Workstations sample:', JSON.stringify(ws, null, 2));

    await db.end();
  } catch (error) {
    console.error(error);
  }
}

check();
