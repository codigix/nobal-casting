import mysql from 'mysql2/promise'

const config = {
  host: '127.0.0.1',
  user: 'nobalcasting_user',
  password: 'C0digix$309',
  database: 'nobalcasting',
  port: 3307
}

async function test() {
  try {
    const connection = await mysql.createConnection(config)
    console.log('Successfully connected to database')
    const [rows] = await connection.execute('SELECT 1 as result')
    console.log('Query result:', rows)
    await connection.end()
  } catch (error) {
    console.error('Connection failed:', error)
  }
}

test()
