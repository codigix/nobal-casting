import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '..', '.env') })

async function deleteInvalidMaterialRequests() {
  let connection

  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║  Delete Invalid Material Requests                           ║')
    console.log('║  Removes: Production dept requests with invalid purposes    ║')
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

    // Step 1: Find candidates for deletion
    console.log('1️⃣  Scanning for invalid requests eligible for deletion...')
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

    // Separate by status - only delete DRAFT requests, flag others for review
    const draftRequests = invalidRequests.filter(r => r.status === 'draft')
    const approvedRequests = invalidRequests.filter(r => r.status !== 'draft')

    console.log('   Breakdown:')
    console.log(`   • DRAFT (eligible for deletion): ${draftRequests.length}`)
    console.log(`   • APPROVED/OTHER (will be flagged for review): ${approvedRequests.length}`)
    console.log()

    // Display what will be deleted
    if (draftRequests.length > 0) {
      console.log('   Draft requests to DELETE:')
      draftRequests.forEach((req, idx) => {
        console.log(`   [${idx + 1}] ${req.mr_id} (${req.series_no}) | ${req.purpose}`)
      })
      console.log()
    }

    // Display what will be flagged
    if (approvedRequests.length > 0) {
      console.log('   Approved/Non-Draft requests to FLAG for manual review:')
      approvedRequests.forEach((req, idx) => {
        console.log(`   [${idx + 1}] ${req.mr_id} (${req.series_no}) | Status: ${req.status}`)
      })
      console.log()
    }

    // Step 2: Delete draft requests
    let deletedCount = 0
    let flaggedCount = 0
    const deletedRecords = []
    const flaggedRecords = []

    if (draftRequests.length > 0) {
      console.log('2️⃣  Deleting DRAFT invalid requests...')

      for (const req of draftRequests) {
        try {
          // First delete items
          await connection.execute(
            'DELETE FROM material_request_item WHERE mr_id = ?',
            [req.mr_id]
          )

          // Then delete the request
          const [result] = await connection.execute(
            'DELETE FROM material_request WHERE mr_id = ?',
            [req.mr_id]
          )

          if (result.affectedRows > 0) {
            deletedCount++
            deletedRecords.push(req)
            console.log(`   ✅ Deleted: ${req.mr_id} (${req.series_no})`)
          }
        } catch (err) {
          console.log(`   ❌ Error deleting ${req.mr_id}: ${err.message}`)
        }
      }
      console.log()
    }

    // Step 3: Flag approved requests for manual review
    if (approvedRequests.length > 0) {
      console.log('3️⃣  Flagging APPROVED invalid requests for manual review...')

      for (const req of approvedRequests) {
        try {
          const reason = `${req.department} department request has invalid purpose: ${req.purpose}. Requires manual review.`

          // Flag in material_request
          await connection.execute(
            `UPDATE material_request 
             SET requires_manual_review = TRUE, review_reason = ? 
             WHERE mr_id = ?`,
            [reason, req.mr_id]
          )

          // Add to review queue
          await connection.execute(
            `INSERT INTO manual_review_queue (mr_id, reason, status) 
             VALUES (?, ?, 'pending')
             ON DUPLICATE KEY UPDATE status = 'pending'`,
            [req.mr_id, reason]
          )

          flaggedCount++
          flaggedRecords.push(req)
          console.log(`   ✅ Flagged: ${req.mr_id} (${req.series_no})`)
        } catch (err) {
          console.log(`   ❌ Error flagging ${req.mr_id}: ${err.message}`)
        }
      }
      console.log()
    }

    // Step 4: Create audit log
    console.log('4️⃣  Creating audit log...')

    for (const record of deletedRecords) {
      await connection.execute(
        `INSERT INTO migration_audit_log (migration_name, mr_id, old_value, new_value, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['delete-invalid-material-requests-v3', record.mr_id, `${record.purpose} (DRAFT)`, 'DELETED', 'deleted']
      )
    }

    for (const record of flaggedRecords) {
      await connection.execute(
        `INSERT INTO migration_audit_log (migration_name, mr_id, old_value, new_value, status)
         VALUES (?, ?, ?, ?, ?)`,
        ['delete-invalid-material-requests-v3', record.mr_id, `${record.purpose} (${record.status})`, 'FLAGGED', 'flagged_for_review']
      )
    }

    console.log(`   ✅ Logged ${deletedRecords.length + flaggedRecords.length} changes\n`)

    // Step 5: Verify
    console.log('5️⃣  Verifying changes...')
    const [remainingInvalid] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM material_request 
       WHERE department = 'Production' 
       AND purpose != 'material_issue'`
    )

    console.log(`   Remaining invalid requests: ${remainingInvalid[0].count}\n`)

    // Step 6: Summary
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ Cleanup completed successfully!                       ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')

    console.log('Summary:')
    console.log(`  • Total invalid requests found: ${invalidRequests.length}`)
    console.log(`  • DRAFT requests DELETED: ${deletedCount}`)
    console.log(`  • APPROVED requests FLAGGED: ${flaggedCount}`)
    console.log(`  • Remaining invalid: ${remainingInvalid[0].count}\n`)

    if (deletedRecords.length > 0) {
      console.log('Deleted records:')
      deletedRecords.forEach(rec => {
        console.log(`  • ${rec.mr_id} (${rec.series_no}) - ${rec.purpose} (Status: ${rec.status})`)
      })
      console.log()
    }

    if (flaggedRecords.length > 0) {
      console.log('Flagged for review:')
      flaggedRecords.forEach(rec => {
        console.log(`  • ${rec.mr_id} (${rec.series_no}) - ${rec.purpose} (Status: ${rec.status})`)
      })
      console.log()
    }

    console.log('Next steps:')
    console.log('  1. Review flagged requests in manual_review_queue table')
    console.log('  2. Use UPDATE material_request SET requires_manual_review = FALSE WHERE mr_id = "..." to clear flags')
    console.log('  3. Check audit log for full history\n')

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗')
    console.error('║  ❌ Operation failed!                                     ║')
    console.error('╚════════════════════════════════════════════════════════════╝\n')
    console.error('Error:', error.message)

    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed.')
    }
  }
}

deleteInvalidMaterialRequests().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
