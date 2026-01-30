import mysql from 'mysql2/promise'

async function dump() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'nobalcasting'
  })

  console.log('\n=== JOB CARD TABLE ===')
  const [jcRows] = await conn.query('DESC job_card')
  console.table(jcRows)

  console.log('\n=== PRODUCTION ENTRY TABLE ===')
  const [peRows] = await conn.query('DESC production_entry')
  console.table(peRows)

  await conn.end()
}

dump()
