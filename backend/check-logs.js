import mysql from 'mysql2/promise'
import { config } from './src/config/config.js'

async function checkLogs() {
  const connection = await mysql.createConnection(config.database)
  
  try {
    const [logs] = await connection.query(
      `SELECT id, grn_request_id, action, status_from, status_to, created_at FROM grn_request_logs ORDER BY grn_request_id DESC, created_at DESC LIMIT 30`
    )
    
    console.log('Recent logs:')
    console.table(logs)
    
    const [duplicates] = await connection.query(
      `SELECT grn_request_id, action, status_from, status_to, created_at, COUNT(*) as count FROM grn_request_logs GROUP BY grn_request_id, action, status_from, status_to, created_at HAVING count > 1`
    )
    
    if (duplicates.length > 0) {
      console.log('\n\nDuplicate logs found:')
      console.table(duplicates)
    } else {
      console.log('\n\nNo duplicate logs found')
    }
  } finally {
    await connection.end()
  }
}

checkLogs().catch(console.error)
