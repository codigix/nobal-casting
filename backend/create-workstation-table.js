#!/usr/bin/env node
import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aluminium_erp',
    port: process.env.DB_PORT || 3306
  })

  try {
    console.log('🔧 Creating Workstation Table\n')

    const execute = async (sql, desc) => {
      try {
        await db.execute(sql)
        console.log(`✓ ${desc}`)
        return true
      } catch (err) {
        console.log(`⚠️  ${desc} - ${err.message.substring(0, 100)}`)
        return false
      }
    }

    const check = async (table) => {
      try {
        const [rows] = await db.query(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?`,
          [table, process.env.DB_NAME || 'aluminium_erp']
        )
        return rows.length > 0
      } catch {
        return false
      }
    }

    console.log('📋 Checking if workstation table exists...')
    const tableExists = await check('workstation')
    
    if (!tableExists) {
      console.log('🔧 Creating workstation table...\n')
      
      await execute(
        `CREATE TABLE workstation (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL COMMENT 'Workstation ID',
          workstation_name VARCHAR(255) NOT NULL COMMENT 'Workstation Name',
          description TEXT COMMENT 'Description of the workstation',
          location VARCHAR(255) COMMENT 'Physical location',
          capacity_per_hour DECIMAL(10, 2) DEFAULT 0 COMMENT 'Production capacity per hour',
          is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether workstation is active',
          status VARCHAR(50) DEFAULT 'active' COMMENT 'Status of the workstation',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_name (name),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Production Workstations'`,
        'Create workstation table'
      )
      
      console.log('\n✓ Workstation table created successfully!')
    } else {
      console.log('✓ Workstation table already exists')
    }

    console.log('\n🎉 Migration complete!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
