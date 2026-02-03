const mysql = require('mysql2/promise');

async function listTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password'
  });

  try {
    const [dbs] = await connection.query("SHOW DATABASES");
    console.log('Databases:', dbs.map(db => db.Database));

    const dbName = 'nobalcasting';
    if (dbs.find(db => db.Database === dbName)) {
      await connection.query(`USE ${dbName}`);
      const [tables] = await connection.query("SHOW TABLES");
      const tableNames = tables.map(t => Object.values(t)[0]);
      console.log('Tables in nobalcasting:', tableNames);
      console.log('Total tables:', tableNames.length);
      console.log('Work order tables:', tableNames.filter(t => t.includes('work_order')));
    } else {
      console.log(`Database ${dbName} not found`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

listTables();
