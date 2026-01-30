import { createPool } from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

async function fixItemNames() {
  const db = createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nobalcasting',
    port: process.env.DB_PORT || 3306
  })

  try {
    const connection = await db.getConnection()
    console.log('✓ Connected to database')

    const updates = [
      { code: 'F-ELECTRICHANDTOOL', name: 'Electric Hand Tool' }
    ]

    for (const update of updates) {
      const [result] = await connection.execute(
        'UPDATE item SET name = ? WHERE item_code = ?',
        [update.name, update.code]
      )
      
      if (result.affectedRows > 0) {
        console.log(`✓ Updated name for ${update.code} to "${update.name}"`)
      } else {
        console.log(`! No item found with code ${update.code}`)
      }
    }

    // Also look for any items with spaces between letters in their name
    const [items] = await connection.query('SELECT item_code, name FROM item')
    for (const item of items) {
      if (item.name && item.name.includes(' ') && item.name.replace(/\s/g, '').length > 3) {
        // If it's something like "F E L E C T R I C", try to clean it
        // A simple check: if more than 50% of chars are spaces, it might be spaced out
        const spaces = (item.name.match(/ /g) || []).length
        if (spaces > item.name.length / 3) {
           const cleanedName = item.name.replace(/\s+/g, '')
           // Try to make it somewhat readable if it was all caps
           // But for now just removing spaces might be enough if it's "F E L E C T R I C" -> "FELECTRIC"
           // Actually, the user wants "Electric Hand Tool".
           console.log(`? Found potentially spaced-out name: "${item.name}" for ${item.item_code}`)
        }
      }
    }

    connection.release()
    await db.end()
    console.log('\nDone.')
  } catch (error) {
    console.error('✗ Error:', error.message)
    process.exit(1)
  }
}

fixItemNames()
