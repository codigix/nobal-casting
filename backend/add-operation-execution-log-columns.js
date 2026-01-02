import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nobalcasting',
  port: parseInt(process.env.DB_PORT || '3306')
})

try {
  // Check if operator_id column exists
  const [operatorIdResult] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'operation_execution_log' AND COLUMN_NAME = 'operator_id'`
  )
  
  if (operatorIdResult.length === 0) {
    console.log('Adding operator_id column...')
    await connection.query(
      `ALTER TABLE operation_execution_log ADD COLUMN operator_id VARCHAR(100) AFTER workstation_id`
    )
    console.log('✓ operator_id column added')
  } else {
    console.log('✓ operator_id column already exists')
  }

  // Check if start_date column exists
  const [startDateResult] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'operation_execution_log' AND COLUMN_NAME = 'start_date'`
  )
  
  if (startDateResult.length === 0) {
    console.log('Adding start_date column...')
    await connection.query(
      `ALTER TABLE operation_execution_log ADD COLUMN start_date DATE AFTER operator_id`
    )
    console.log('✓ start_date column added')
  } else {
    console.log('✓ start_date column already exists')
  }

  // Check if start_time column exists
  const [startTimeResult] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME = 'operation_execution_log' AND COLUMN_NAME = 'start_time'`
  )
  
  if (startTimeResult.length === 0) {
    console.log('Adding start_time column...')
    await connection.query(
      `ALTER TABLE operation_execution_log ADD COLUMN start_time TIME AFTER start_date`
    )
    console.log('✓ start_time column added')
  } else {
    console.log('✓ start_time column already exists')
  }

  console.log('✓ Migration completed successfully')
} catch (error) {
  console.error('Migration failed:', error.message)
} finally {
  await connection.end()
}
