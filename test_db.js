import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function testConnection(port) {
  console.log(`Testing connection to port ${port}...`);
  try {
    const connection = await createConnection({
      host: '127.0.0.1',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: port,
      connectTimeout: 2000
    });
    console.log(`✓ Successfully connected to port ${port}`);
    await connection.end();
  } catch (error) {
    console.error(`✗ Failed to connect to port ${port}: ${error.message}`);
  }
}

async function run() {
  await testConnection(3306);
  await testConnection(3307);
}

run();
