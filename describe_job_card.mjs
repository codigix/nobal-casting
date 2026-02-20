import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend/.env') });

(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3307,
      user: process.env.DB_USER || 'nobalcasting_user',
      password: process.env.DB_PASSWORD || 'C0digix$309',
      database: process.env.DB_NAME || 'nobalcasting'
    });
    const [rows] = await db.execute('DESCRIBE job_card');
    console.log(JSON.stringify(rows, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
