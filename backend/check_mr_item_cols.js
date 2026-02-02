import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function checkMRItem() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [cols] = await conn.query('DESCRIBE material_request_item');
    console.table(cols);
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
  }
}

checkMRItem();
