const mysql = require('mysql2/promise');

async function checkProductionEntries() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const [rows] = await connection.execute(
      "SELECT * FROM selling_delivery_note"
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

checkProductionEntries();
