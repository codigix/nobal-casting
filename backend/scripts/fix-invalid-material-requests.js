import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function fixInvalidMaterialRequests() {
  let connection

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Material Request Validation Migration                    ║')
    console.log('║  Fixing: Production dept requests with invalid purposes   ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'nobalcasting'
    }

    console.log('📡 Connecting to database:', dbConfig.database)
    connection = await mysql.createConnection(dbConfig)
    console.log('✅ Connection established\n')

    // Step 1: Find invalid requests (Production dept with non-material_issue purpose)
    console.log('1️⃣  Scanning for invalid requests...')
    const [invalidRequests] = await connection.execute(
      `SELECT mr_id, series_no, department, purpose, status, created_at 
       FROM material_request 
       WHERE department = 'Production' 
       AND purpose != 'material_issue'
       ORDER BY created_at DESC`
    )

    console.log(`   Found ${invalidRequests.length} invalid request(s)\n`)

    if (invalidRequests.length === 0) {
      console.log('╔════════════════════════════════════════════════════════════╗')
      console.log('║  ✅ No invalid requests found - Database is clean!         ║')
      console.log('╚════════════════════════════════════════════════════════════╝\n')
      return
    }

    // Display invalid records
    console.log('   Invalid requests to fix:')
    invalidRequests.forEach((req, idx) => {
      console.log(`   [${idx + 1}] MR: ${req.mr_id} | ${req.series_no} | Dept: ${req.department} | Purpose: ${req.purpose} | Status: ${req.status}`)
    })
    console.log()

    // Step 2: Auto-fix Strategy 1 - Convert to material_issue
    console.log('2️⃣  Strategy 1: Auto-fixing to material_issue...')
    let fixedCount = 0
    let errorCount = 0
    const fixedRecords = []

    for (const req of invalidRequests) {
      try {
        const [result] = await connection.execute(
          `UPDATE material_request 
           SET purpose = 'material_issue', updated_at = NOW() 
           WHERE mr_id = ?`,
          [req.mr_id]
        )

        if (result.affectedRows > 0) {
          fixedCount++
          fixedRecords.push(req)
          console.log(`   ✅ Fixed: ${req.mr_id} (${req.series_no}) - Purpose changed to material_issue`)
        }
      } catch (err) {
        errorCount++
        console.log(`   ❌ Error fixing ${req.mr_id}: ${err.message}`)
      }
    }

    console.log()

    // Step 3: Verify fixes
    console.log('3️⃣  Verifying fixes...')
    const [stillInvalid] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM material_request 
       WHERE department = 'Production' 
       AND purpose != 'material_issue'`
    )

    const remainingInvalid = stillInvalid[0].count
    console.log(`   Remaining invalid requests: ${remainingInvalid}`)
    console.log()

    // Step 4: Create audit log
    console.log('4️⃣  Creating audit log...')
    
    // First check if audit table exists
    const [tableCheck] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'migration_audit_log'`,
      [dbConfig.database]
    )

    if (!tableCheck.length) {
      console.log('   Creating migration_audit_log table...')
      await connection.execute(
        `CREATE TABLE migration_audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          migration_name VARCHAR(100),
          mr_id VARCHAR(50),
          old_value VARCHAR(255),
          new_value VARCHAR(255),
          status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_migration (migration_name),
          INDEX idx_mr (mr_id)
        )`
      )
      console.log('   ✅ Audit table created')
    }

    // Log all changes
    for (const record of fixedRecords) {
      await connection.execute(
        `INSERT INTO migration_audit_log (migration_name, mr_id, old_value, new_value, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['fix-invalid-material-requests-v1', record.mr_id, record.purpose, 'material_issue', 'fixed']
      )
    }

    console.log(`   ✅ Logged ${fixedRecords.length} changes to audit table\n`)

    // Step 5: Summary
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Migration completed successfully!                     ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('Summary:')
    console.log(`  • Found invalid requests: ${invalidRequests.length}`)
    console.log(`  • Fixed automatically: ${fixedCount}`)
    console.log(`  • Errors: ${errorCount}`)
    console.log(`  • Remaining invalid: ${remainingInvalid}`)
    console.log(`  • Strategy: Production + [non-material_issue] → Production + material_issue\n`)

    if (fixedRecords.length > 0) {
      console.log('Fixed records:')
      fixedRecords.forEach(rec => {
        console.log(`  • ${rec.mr_id} (${rec.series_no}) - ${rec.purpose} → material_issue`)
      })
      console.log()
    }

    console.log('Next steps:')
    console.log('  1. Review audit log: SELECT * FROM migration_audit_log WHERE migration_name = "fix-invalid-material-requests-v1"')
    console.log('  2. Verify Material Requests list in UI')
    console.log('  3. Test approval workflow for Production department requests\n')

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗')
    console.error('║  ❌ Migration failed!                                     ║')
    console.error('╚════════════════════════════════════════════════════════════╝\n')
    console.error('Error:', error.message)
    console.error('\nDetails:', error)

    console.error('\nTroubleshooting:')
    console.error('  1. Ensure MySQL is running')
    console.error('  2. Verify database credentials in .env file')
    console.error('  3. Check that material_request table exists')
    console.error('  4. Verify database has proper permissions\n')

    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

fixInvalidMaterialRequests().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
