import { createPool } from 'mysql2/promise'

async function runTest() {
  try {
    // Setup database exactly like the app does
    const db = createPool({
      host: 'localhost',
      user: 'erp_user',
      password: 'erp_password',
      database: 'nobalcasting',
      port: 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    })
    
    global.db = db
    
    console.log('Testing sales orders endpoint method directly...\n')
    
    // Create mock req/res objects
    const req = {}
    const res = {
      json: function(data) {
        console.log('Response sent:')
        console.log(JSON.stringify(data, null, 2))
      }
    }
    
    // Now import and call the controller
    const { default: MastersController } = await import('./backend/src/controllers/MastersController.js')
    
    console.log('Calling getSalesOrdersAsProjects...')
    await MastersController.getSalesOrdersAsProjects(req, res)
    
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

runTest()
