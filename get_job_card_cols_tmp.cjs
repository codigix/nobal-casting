
const mysql = require('mysql2/promise');
async function run() {
  const c = await mysql.createConnection({
    host:'127.0.0.1',
    user:'nobalcasting_user',
    password:'C0digix$309',
    database:'nobalcasting',
    port: 3307
  });
  const [cols] = await c.query('DESCRIBE job_card');
  console.log(cols.map(col => col.Field));
  await c.end();
}
run();
