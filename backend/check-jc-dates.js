import mysql from 'mysql2/promise'

async function checkDates() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'erp_user',
    password: 'erp_password',
    database: 'nobalcasting'
  })

  try {
    // Get last 7 days
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    console.log('=== JOB CARDS BY DATE (Last 7 Days) ===\n')

    for (const dateStr of last7Days) {
      const [counts] = await connection.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM job_card
        WHERE DATE(created_at) = ?
        GROUP BY status
      `, [dateStr])

      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr).getDay()]
      
      if (counts.length > 0) {
        console.log(`${dayName} (${dateStr}):`)
        counts.forEach(row => console.log(`  ${row.status}: ${row.count}`))
      } else {
        console.log(`${dayName} (${dateStr}): No data`)
      }
      console.log()
    }

  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await connection.end()
  }
}

checkDates()
