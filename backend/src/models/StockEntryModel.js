import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'
import { PeriodClosingModel } from './PeriodClosingModel.js'
import StockMovementModel from './StockMovementModel.js'

class StockEntryModel {
  static getDb() {
    return global.db
  }

  // Get all stock entries
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          se.id,
          se.id as entry_id,
          se.entry_no,
          se.entry_date,
          se.entry_type,
          se.purpose,
          se.reference_doctype,
          se.reference_name,
          se.remarks,
          se.status,
          se.from_warehouse_id,
          se.to_warehouse_id,
          se.created_by,
          se.created_at,
          se.updated_at,
          fw.warehouse_code as from_warehouse_code,
          fw.warehouse_name as from_warehouse_name,
          tw.warehouse_code as to_warehouse_code,
          tw.warehouse_name as to_warehouse_name,
          se.total_qty,
          se.total_value,
          COALESCE(tw.warehouse_name, fw.warehouse_name) as warehouse_name,
          u.full_name as created_by_user,
          COUNT(sei.id) as total_items
        FROM stock_entries se
        LEFT JOIN warehouses fw ON se.from_warehouse_id = fw.id
        LEFT JOIN warehouses tw ON se.to_warehouse_id = tw.id
        LEFT JOIN users u ON se.created_by = u.user_id
        LEFT JOIN stock_entry_items sei ON se.id = sei.stock_entry_id
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND se.status = ?'
        params.push(filters.status)
      }

      if (filters.entryType) {
        query += ' AND se.entry_type = ?'
        params.push(filters.entryType)
      }

      if (filters.warehouseId) {
        query += ' AND (se.from_warehouse_id = ? OR se.to_warehouse_id = ?)'
        params.push(filters.warehouseId, filters.warehouseId)
      }

      if (filters.startDate) {
        query += ' AND DATE(se.entry_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(se.entry_date) <= ?'
        params.push(filters.endDate)
      }

      if (filters.search) {
        query += ' AND se.entry_no LIKE ?'
        params.push(`%${filters.search}%`)
      }

      query += ' GROUP BY se.id ORDER BY se.entry_date DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch stock entries: ${error.message}`)
    }
  }

  // Get stock entry by ID
  static async getById(id) {
    try {
      const db = this.getDb()
      const [entryRows] = await db.query(
        `SELECT 
          se.*,
          fw.warehouse_code as from_warehouse_code,
          fw.warehouse_name as from_warehouse_name,
          tw.warehouse_code as to_warehouse_code,
          tw.warehouse_name as to_warehouse_name,
          u.full_name as created_by_user
        FROM stock_entries se
        LEFT JOIN warehouses fw ON se.from_warehouse_id = fw.id
        LEFT JOIN warehouses tw ON se.to_warehouse_id = tw.id
        LEFT JOIN users u ON se.created_by = u.user_id
        WHERE se.id = ?`,
        [id]
      )

      if (!entryRows[0]) return null

      const entry = entryRows[0]

      // Get items - handle both old (item_id) and new (item_code) schemas
      let items = []
      try {
        // Try new schema with item_code
        const [result] = await db.query(
          `SELECT 
            sei.*,
            i.item_code,
            i.name as item_name,
            COALESCE(sei.uom, 'Kg') as uom
          FROM stock_entry_items sei
          LEFT JOIN item i ON sei.item_code = i.item_code
          WHERE sei.stock_entry_id = ?`,
          [id]
        )
        items = result
      } catch (e) {
        if (e.message.includes("Unknown column 'item_code'")) {
          // Fall back to old schema with item_id
          const [result] = await db.query(
            `SELECT 
              sei.*,
              i.item_code,
              i.name as item_name,
              COALESCE(sei.uom, 'Kg') as uom
            FROM stock_entry_items sei
            LEFT JOIN item i ON sei.item_id = i.id
            WHERE sei.stock_entry_id = ?`,
            [id]
          )
          items = result
        } else {
          throw e
        }
      }

      entry.items = items
      return entry
    } catch (error) {
      throw new Error(`Failed to fetch stock entry: ${error.message}`)
    }
  }

  // Get stock entry by entry number
  static async getByEntryNo(entryNo) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        'SELECT * FROM stock_entries WHERE entry_no = ?',
        [entryNo]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch stock entry: ${error.message}`)
    }
  }

  // Create stock entry
  static async create(data, dbConnection = null) {
    try {
      const db = dbConnection || this.getDb()
      const {
        entry_no,
        entry_date,
        entry_type,
        from_warehouse_id,
        to_warehouse_id,
        purpose,
        reference_doctype,
        reference_name,
        remarks,
        created_by,
        items = []
      } = data

      // Check if GRN already has a stock entry
      if (reference_doctype === 'GRN' && reference_name) {
        const [existingEntries] = await db.query(
          'SELECT id FROM stock_entries WHERE reference_doctype = ? AND reference_name = ?',
          ['GRN', reference_name]
        )
        if (existingEntries.length > 0) {
          throw new Error(`A stock entry already exists for GRN ${reference_name}. You cannot create another entry for the same GRN.`)
        }
      }

      // Use provided connection or get a new one and start transaction
      let connection = dbConnection
      let isLocalTransaction = false
      
      if (!connection) {
        connection = await db.getConnection()
        await connection.beginTransaction()
        isLocalTransaction = true
      }

      try {
        // Create entry
        const [result] = await connection.query(
          `INSERT INTO stock_entries (
            entry_no, entry_date, entry_type, from_warehouse_id, to_warehouse_id,
            purpose, reference_doctype, reference_name, status, remarks, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?)`,
          [
            entry_no, entry_date, entry_type, from_warehouse_id || null, to_warehouse_id || null,
            purpose, reference_doctype, reference_name, remarks, created_by
          ]
        )

        const entryId = result.insertId
        let totalQty = 0
        let totalValue = 0

        // Add items
        console.log('Processing items:', JSON.stringify(items, null, 2))
        for (const item of items) {
          const qty = Number(item.qty) || 0
          const valuationRate = Number(item.valuation_rate) || 0
          const itemValue = qty * valuationRate
          totalQty += qty
          totalValue += itemValue

          if (!item.item_code) {
            throw new Error(`Item code is required`)
          }

          const [itemRows] = await connection.query(
            'SELECT item_code FROM item WHERE item_code = ?',
            [item.item_code]
          )
          if (!itemRows[0]) {
            throw new Error(`Item not found with code: ${item.item_code}`)
          }
          
          await connection.query(
            `INSERT INTO stock_entry_items (
              stock_entry_id, item_code, qty, uom, valuation_rate, 
              transaction_value, batch_no, serial_no, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              entryId,
              item.item_code,
              qty,
              item.uom || 'Kg',
              valuationRate,
              itemValue,
              item.batch_no || null,
              item.serial_no || null,
              item.remarks || null
            ]
          )
        }

        // Update total
        await connection.query(
          'UPDATE stock_entries SET total_qty = ?, total_value = ? WHERE id = ?',
          [totalQty, totalValue, entryId]
        )

        if (isLocalTransaction) {
          await connection.commit()
        }
        return this.getById(entryId)
      } catch (error) {
        if (isLocalTransaction) {
          await connection.rollback()
        }
        console.error('Stock entry creation error:', error)
        throw error
      } finally {
        if (isLocalTransaction) {
          connection.release()
        }
      }
    } catch (error) {
      console.error('Stock entry model error:', error)
      throw new Error(`Failed to create stock entry: ${error.message}`)
    }
  }

  // Update stock entry
  static async update(id, data) {
    try {
      const db = this.getDb()
      const { purpose, remarks, updated_by } = data

      await db.query(
        `UPDATE stock_entries SET purpose = ?, remarks = ?, updated_by = ? WHERE id = ? AND status = 'Draft'`,
        [purpose, remarks, updated_by, id]
      )

      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to update stock entry: ${error.message}`)
    }
  }

  // Submit stock entry
  static async submit(id, userId, dbConnection = null) {
    try {
      const db = dbConnection || this.getDb()
      
      let connection = dbConnection
      let isLocalTransaction = false
      
      if (!connection) {
        connection = await db.getConnection()
        await connection.beginTransaction()
        isLocalTransaction = true
      }

      try {
        const entry = await this.getById(id)
        if (!entry) throw new Error('Stock entry not found')

        await PeriodClosingModel.checkLock(connection, entry.entry_date)

        await connection.query(
          `UPDATE stock_entries SET status = 'Submitted', submitted_at = NOW(), approved_by = ? WHERE id = ?`,
          [userId, id]
        )

        const allItemCodes = [...new Set(entry.items.map(i => i.item_code))]
        const warehouseIds = [entry.from_warehouse_id, entry.to_warehouse_id].filter(id => id)

        // 1. Pre-fetch valuation methods
        const [valuationRows] = await connection.query(
          'SELECT item_code, valuation_method FROM item WHERE item_code IN (?)', 
          [allItemCodes]
        )
        const valuationMethods = valuationRows.reduce((acc, row) => {
          acc[row.item_code] = row.valuation_method
          return acc
        }, {})

        // 2. Pre-fetch and lock stock balances
        const [balanceRows] = await connection.query(
          'SELECT item_code, warehouse_id, current_qty, valuation_rate, reserved_qty FROM stock_balance WHERE item_code IN (?) AND warehouse_id IN (?) FOR UPDATE',
          [allItemCodes, warehouseIds]
        )
        const currentBalances = balanceRows.reduce((acc, row) => {
          acc[`${row.item_code}-${row.warehouse_id}`] = {
            current_qty: Number(row.current_qty) || 0,
            valuation_rate: Number(row.valuation_rate) || 0,
            reserved_qty: Number(row.reserved_qty) || 0
          }
          return acc
        }, {})

        // 3. Pre-fetch latest ledger balances
        const [ledgerRows] = await connection.query(
          `SELECT item_code, warehouse_id, balance_qty 
           FROM stock_ledger 
           WHERE (item_code, warehouse_id, id) IN (
             SELECT item_code, warehouse_id, MAX(id) 
             FROM stock_ledger 
             WHERE item_code IN (?) AND warehouse_id IN (?) 
             GROUP BY item_code, warehouse_id
           )`,
          [allItemCodes, warehouseIds]
        )
        const latestLedgerBalances = ledgerRows.reduce((acc, row) => {
          acc[`${row.item_code}-${row.warehouse_id}`] = Number(row.balance_qty) || 0
          return acc
        }, {})

        const sortedItems = [...entry.items].sort((a, b) => (a.item_code || '').localeCompare(b.item_code || ''))
        const uniqueItemCodes = new Set()
        const stockMovementData = []
        const ledgerEntries = []
        const balanceUpdates = new Map() // Use Map to aggregate updates for same item-warehouse

        const transactionTypeMap = {
          'Material Receipt': 'Purchase Receipt',
          'Material Issue': 'Issue',
          'Material Transfer': 'Transfer',
          'Manufacturing Return': 'Manufacturing Return',
          'Repack': 'Repack',
          'Scrap Entry': 'Scrap Entry'
        }
        const transactionType = transactionTypeMap[entry.entry_type] || entry.entry_type

        for (const item of sortedItems) {
          const itemCode = item.item_code
          const itemQty = Number(item.qty) || 0
          uniqueItemCodes.add(itemCode)
          const method = valuationMethods[itemCode] || 'FIFO'
          
          let finalValuationRate = Number(item.valuation_rate) || 0

          // Handle Outward movement
          if (['Material Issue', 'Material Transfer', 'Scrap Entry', 'Repack'].includes(entry.entry_type)) {
            const fromWarehouseId = entry.from_warehouse_id
            if (!fromWarehouseId) throw new Error(`Source warehouse is required for ${entry.entry_type}`)
            
            const balanceKey = `${itemCode}-${fromWarehouseId}`
            const existing = currentBalances[balanceKey] || { current_qty: 0, valuation_rate: 0, reserved_qty: 0 }
            
            // Calculate rate - only call StockLedgerModel if not Moving Average or if cache is missing
            if (method === 'Moving Average') {
              finalValuationRate = existing.valuation_rate
            } else {
              finalValuationRate = await StockLedgerModel.getValuationRate(itemCode, fromWarehouseId, itemQty, method, connection)
            }
            
            // Update memory balance
            existing.current_qty -= itemQty
            // Note: valuation_rate for summary doesn't change on outward move for FIFO/LIFO
            
            // Ledger entry
            const prevLedgerBalance = latestLedgerBalances[balanceKey] || 0
            const newLedgerBalance = prevLedgerBalance - itemQty
            latestLedgerBalances[balanceKey] = newLedgerBalance
            
            ledgerEntries.push([
              itemCode, fromWarehouseId, entry.entry_date, transactionType,
              0, itemQty, newLedgerBalance, finalValuationRate, itemQty * finalValuationRate,
              item.batch_no || null, 'Stock Entry', entry.entry_no, entry.remarks, userId
            ])
            
            balanceUpdates.set(balanceKey, {
              item_code: itemCode,
              warehouse_id: fromWarehouseId,
              ...existing,
              last_issue_date: entry.entry_date
            })
          }

          // Handle Inward movement
          if (['Material Receipt', 'Material Transfer', 'Manufacturing Return', 'Repack'].includes(entry.entry_type)) {
            const toWarehouseId = entry.to_warehouse_id
            if (!toWarehouseId) throw new Error(`Target warehouse is required for ${entry.entry_type}`)
            
            const balanceKey = `${itemCode}-${toWarehouseId}`
            const existing = currentBalances[balanceKey] || { current_qty: 0, valuation_rate: 0, reserved_qty: 0 }
            
            const incomingRate = entry.entry_type === 'Material Transfer' ? finalValuationRate : Number(item.valuation_rate)
            
            // Moving Average calculation for the summary rate
            const oldQty = existing.current_qty
            const oldRate = existing.valuation_rate
            const newQty = oldQty + itemQty
            
            if (newQty > 0) {
              existing.valuation_rate = ((oldQty * oldRate) + (itemQty * incomingRate)) / newQty
            } else {
              existing.valuation_rate = incomingRate
            }
            existing.current_qty = newQty
            
            // Ledger entry
            const prevLedgerBalance = latestLedgerBalances[balanceKey] || 0
            const newLedgerBalance = prevLedgerBalance + itemQty
            latestLedgerBalances[balanceKey] = newLedgerBalance
            
            ledgerEntries.push([
              itemCode, toWarehouseId, entry.entry_date, transactionType,
              itemQty, 0, newLedgerBalance, incomingRate, itemQty * incomingRate,
              item.batch_no || null, 'Stock Entry', entry.entry_no, entry.remarks, userId
            ])
            
            balanceUpdates.set(balanceKey, {
              item_code: itemCode,
              warehouse_id: toWarehouseId,
              ...existing,
              last_receipt_date: entry.entry_date
            })
          }

          const movement_type = entry.entry_type === 'Material Receipt' ? 'IN' : 
                               entry.entry_type === 'Material Issue' ? 'OUT' : 
                               entry.entry_type === 'Material Transfer' ? 'TRANSFER' : 
                               (entry.to_warehouse_id ? 'IN' : 'OUT')
          
          stockMovementData.push({ itemCode, itemQty, movement_type, batch_no: item.batch_no })
        }

        // 4. Bulk insert Stock Ledger entries
        if (ledgerEntries.length > 0) {
          for (let i = 0; i < ledgerEntries.length; i += 100) {
            const chunk = ledgerEntries.slice(i, i + 100)
            await connection.query(
              `INSERT INTO stock_ledger (
                item_code, warehouse_id, transaction_date, transaction_type, 
                qty_in, qty_out, balance_qty, valuation_rate, transaction_value,
                batch_no, reference_doctype, reference_name, remarks, created_by
              ) VALUES ?`,
              [chunk]
            )
          }
        }

        // 5. Bulk upsert Stock Balances
        if (balanceUpdates.size > 0) {
          const updates = Array.from(balanceUpdates.values())
          const values = updates.map(u => [
            u.item_code, u.warehouse_id, u.current_qty, u.reserved_qty, 
            u.current_qty - u.reserved_qty, u.valuation_rate, u.current_qty * u.valuation_rate,
            u.last_receipt_date || null, u.last_issue_date || null
          ])
          
          for (let i = 0; i < values.length; i += 100) {
            const chunk = values.slice(i, i + 100)
            await connection.query(
              `INSERT INTO stock_balance 
                (item_code, warehouse_id, current_qty, reserved_qty, available_qty, valuation_rate, total_value, last_receipt_date, last_issue_date)
              VALUES ?
              ON DUPLICATE KEY UPDATE 
                current_qty = VALUES(current_qty),
                reserved_qty = VALUES(reserved_qty),
                available_qty = VALUES(available_qty),
                valuation_rate = VALUES(valuation_rate),
                total_value = VALUES(total_value),
                last_receipt_date = COALESCE(VALUES(last_receipt_date), last_receipt_date),
                last_issue_date = COALESCE(VALUES(last_issue_date), last_issue_date),
                updated_at = CURRENT_TIMESTAMP`,
              [chunk]
            )
          }
        }

        // 6. Bulk Create Stock Movement entries
        if (stockMovementData.length > 0) {
          try {
            const base_transaction_no = await StockMovementModel.generateTransactionNo(connection)
            const datePart = base_transaction_no.substring(4, 12)
            const startSeq = parseInt(base_transaction_no.substring(13))
            
            const values = []
            for (let i = 0; i < stockMovementData.length; i++) {
              const sm = stockMovementData[i]
              const seq = startSeq + i
              const transaction_no = `STK-${datePart}-${String(seq).padStart(5, '0')}`
              
              const warehouse_id = sm.movement_type === 'TRANSFER' ? null : (sm.movement_type === 'IN' ? entry.to_warehouse_id : entry.from_warehouse_id)
              const source_warehouse_id = sm.movement_type === 'TRANSFER' ? entry.from_warehouse_id : null
              const target_warehouse_id = sm.movement_type === 'TRANSFER' ? entry.to_warehouse_id : null
              
              values.push([
                transaction_no, sm.itemCode, warehouse_id, source_warehouse_id, target_warehouse_id,
                sm.movement_type, sm.itemQty, 'Stock Entry', entry.entry_no,
                entry.remarks || `Auto-generated from Stock Entry ${entry.entry_no}`,
                sm.batch_no || null, 'Approved', userId || null, userId || null
              ])
            }

            for (let i = 0; i < values.length; i += 100) {
              const chunk = values.slice(i, i + 100)
              await connection.query(
                `INSERT INTO stock_movements (
                  transaction_no, item_code, warehouse_id, source_warehouse_id, target_warehouse_id, 
                  movement_type, quantity, reference_type, reference_name, notes, batch_no, status, created_by, approved_by, approved_at
                ) VALUES ?`,
                [chunk.map(v => [...v, new Date()])]
              )
            }
          } catch (smError) {
            console.error('Failed to create bulk stock movement entries:', smError)
          }
        }

        // 7. Final sync of valuation_rate to item table
        if (uniqueItemCodes.size > 0) {
          const itemCodesArray = Array.from(uniqueItemCodes)
          try {
            await connection.query(`
              UPDATE item i
              JOIN (
                SELECT item_code, 
                       CASE 
                         WHEN SUM(current_qty) > 0 THEN SUM(current_qty * valuation_rate) / SUM(current_qty)
                         ELSE MAX(valuation_rate)
                       END as avg_rate
                FROM stock_balance
                WHERE item_code IN (?)
                GROUP BY item_code
              ) sb_avg ON i.item_code = sb_avg.item_code
              SET i.valuation_rate = sb_avg.avg_rate
            `, [itemCodesArray])
          } catch (syncError) {
            console.error('Failed to sync bulk valuation_rate:', syncError)
          }
        }

        if (isLocalTransaction) {
          await connection.commit()
        }
        return this.getById(id)
      } catch (error) {
        if (isLocalTransaction) {
          await connection.rollback()
        }
        throw error
      } finally {
        if (isLocalTransaction) {
          connection.release()
        }
      }
    } catch (error) {
      throw new Error(`Failed to submit stock entry: ${error.message}`)
    }
  }

  // Cancel stock entry
  static async cancel(id, userId) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Get entry details
        const entry = await this.getById(id)
        if (!entry) throw new Error('Stock entry not found')

        if (entry.status !== 'Submitted') {
          throw new Error('Only submitted stock entries can be cancelled')
        }

        // Check for period closing lock
        await PeriodClosingModel.checkLock(connection, entry.entry_date)

        // Process each item to REVERSE movements
        for (const item of entry.items) {
          const itemCode = item.item_code
          const itemQty = Number(item.qty) || 0
          const valuationRate = Number(item.valuation_rate) || 0

          const transactionTypeMap = {
            'Material Receipt': 'Purchase Receipt',
            'Material Issue': 'Issue',
            'Material Transfer': 'Transfer',
            'Manufacturing Return': 'Manufacturing Return',
            'Repack': 'Repack',
            'Scrap Entry': 'Scrap Entry'
          }
          const transactionType = transactionTypeMap[entry.entry_type] || entry.entry_type

          // 1. Reverse Inward movement (Receipt, Transfer, Manufacturing Return, Repack)
          if (['Material Receipt', 'Material Transfer', 'Manufacturing Return', 'Repack'].includes(entry.entry_type)) {
            const toWarehouseId = entry.to_warehouse_id
            if (toWarehouseId) {
              // Deduct from Target (Reverse of Addition)
              await StockBalanceModel.upsert(itemCode, toWarehouseId, {
                current_qty: -itemQty,
                is_increment: true
              }, connection)

              // Add Ledger Entry (REVERSAL - OUT)
              await StockLedgerModel.create({
                item_code: itemCode,
                warehouse_id: toWarehouseId,
                transaction_date: new Date().toISOString().split('T')[0],
                transaction_type: transactionType,
                qty_in: 0,
                qty_out: itemQty,
                valuation_rate: valuationRate,
                batch_no: item.batch_no,
                reference_doctype: 'Stock Entry',
                reference_name: entry.entry_no,
                remarks: `Reversal of ${entry.entry_no} (Cancelled)`,
                created_by: userId
              }, connection)
            }
          }

          // 2. Reverse Outward movement (Issue, Transfer, Scrap, Repack)
          if (['Material Issue', 'Material Transfer', 'Scrap Entry', 'Repack'].includes(entry.entry_type)) {
            const fromWarehouseId = entry.from_warehouse_id
            if (fromWarehouseId) {
              // Add back to Source (Reverse of Deduction)
              await StockBalanceModel.upsert(itemCode, fromWarehouseId, {
                current_qty: itemQty,
                is_increment: true
              }, connection)

              // Add Ledger Entry (REVERSAL - IN)
              await StockLedgerModel.create({
                item_code: itemCode,
                warehouse_id: fromWarehouseId,
                transaction_date: new Date().toISOString().split('T')[0],
                transaction_type: transactionType,
                qty_in: itemQty,
                qty_out: 0,
                valuation_rate: valuationRate,
                batch_no: item.batch_no,
                reference_doctype: 'Stock Entry',
                reference_name: entry.entry_no,
                remarks: `Reversal of ${entry.entry_no} (Cancelled)`,
                created_by: userId
              }, connection)
            }
          }
        }

        // Update status
        await connection.query(
          `UPDATE stock_entries SET status = 'Cancelled', updated_by = ? WHERE id = ?`,
          [userId, id]
        )

        await connection.commit()
        return this.getById(id)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to cancel stock entry: ${error.message}`)
    }
  }

  // Delete stock entry (only if Draft)
  static async delete(id) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Get entry status without detailed items to avoid numeric value issues
        const [entryRows] = await connection.query(
          'SELECT id, status FROM stock_entries WHERE id = ?',
          [id]
        )
        
        if (!entryRows[0]) {
          throw new Error('Stock entry not found')
        }
        
        const entry = entryRows[0]
        if (entry.status !== 'Draft') {
          throw new Error('Cannot delete submitted or cancelled stock entries')
        }

        // Delete related stock entry items first
        await connection.query('DELETE FROM stock_entry_items WHERE stock_entry_id = ?', [id])
        
        // Delete the stock entry
        const [result] = await connection.query('DELETE FROM stock_entries WHERE id = ?', [id])
        
        await connection.commit()
        return result.affectedRows > 0
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to delete stock entry: ${error.message}`)
    }
  }

  // Generate next entry number
  static async generateEntryNo(entryType) {
    try {
      const db = this.getDb()
      const prefix = entryType.substring(0, 2).toUpperCase()
      const date = new Date()
      const yearMonth = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0')
      
      const [result] = await db.query(
        `SELECT MAX(CAST(SUBSTRING(entry_no, -6) AS UNSIGNED)) as max_no 
        FROM stock_entries 
        WHERE entry_no LIKE ?`,
        [`${prefix}-${yearMonth}-%`]
      )

      const nextNo = (result[0].max_no || 0) + 1
      return `${prefix}-${yearMonth}-${String(nextNo).padStart(6, '0')}`
    } catch (error) {
      throw new Error(`Failed to generate entry number: ${error.message}`)
    }
  }
}

export default StockEntryModel
