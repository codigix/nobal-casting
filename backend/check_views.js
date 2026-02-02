import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function checkViews() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [views] = await conn.query('SHOW FULL TABLES WHERE Table_type = "VIEW"');
    console.table(views);
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

checkViews();
