#!/usr/bin/env node
import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const db = createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3307
  })

  try {
    console.log('🔧 Creating Resource Notification Request Table\n')

    await db.execute(`
      CREATE TABLE IF NOT EXISTS resource_notification_request (
        id INT AUTO_INCREMENT PRIMARY KEY,
        resource_type ENUM('machine', 'operator') NOT NULL,
        resource_id VARCHAR(100) NOT NULL,
        user_id INT NOT NULL,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified BOOLEAN DEFAULT FALSE,
        INDEX idx_resource (resource_type, resource_id),
        INDEX idx_notified (notified)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    console.log('✓ Resource notification request table created successfully!')
    process.exit(0)
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  } finally {
    await db.end()
  }
}

main()
