import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function query() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });

  try {
    const [items] = await connection.execute("SELECT item_code, name FROM item WHERE name LIKE '%Cooling Rail%'");
    console.log('Items found:', items);
    
    const [ops] = await connection.execute("SELECT * FROM bom_operation WHERE bom_id = 'BOM-1770637729524'");
    console.log('Operations for SA-FINALFRAMEASSEMBLY:', ops);

    const [ops2] = await connection.execute("SELECT * FROM bom_operation WHERE bom_id = 'BOM-1770637847670'");
    console.log('Operations for SA-MOUNTINGCLAMPASSEMBLY:', ops2);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

query();
