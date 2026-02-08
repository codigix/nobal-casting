import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
  });

  try {
    const [tables] = await connection.query("SHOW TABLES");
    console.log('Tables in DB:', tables.map(t => Object.values(t)[0]));

    const [workstation] = await connection.query("SELECT * FROM workstation");
    console.log('\nWorkstation records:', workstation.length);
    if (workstation.length > 0) console.log('Sample workstation:', workstation[0]);

    const [prodMachines] = await connection.query("SHOW TABLES LIKE 'production_machines'");
    if (prodMachines.length > 0) {
      const [pmRecords] = await connection.query("SELECT * FROM production_machines");
      console.log('\nProduction machines records:', pmRecords.length);
      if (pmRecords.length > 0) console.log('Sample production machine:', pmRecords[0]);
    } else {
      console.log('\nproduction_machines table does not exist');
    }

    const [prodEntries] = await connection.query("SELECT * FROM production_entry LIMIT 5");
    console.log('\nSample Production entries:', prodEntries);

    const [jobCards] = await connection.query("SELECT * FROM job_card LIMIT 5");
    console.log('\nSample Job cards:', jobCards);

    const [peSchema] = await connection.query("DESCRIBE production_entry");
    console.log('\nProduction Entry Schema:', peSchema);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

checkDB();
