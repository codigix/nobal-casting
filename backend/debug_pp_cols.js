
import mysql from 'mysql2/promise';
(async () => {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nobalcasting'
  });
  await db.execute("ALTER TABLE material_request MODIFY COLUMN status ENUM('draft','pending','approved','converted','cancelled','completed') DEFAULT 'draft'");
  console.log('Enum updated');
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
