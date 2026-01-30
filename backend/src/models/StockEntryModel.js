import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'
import { PeriodClosingModel } from './PeriodClosingModel.js'

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
  static async create(data) {
    try {
      const db = this.getDb()
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

      // Start transaction
      const connection = await db.getConnection()
      await connection.beginTransaction()

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

        await connection.commit()
        return this.getById(entryId)
      } catch (error) {
        await connection.rollback()
        console.error('Stock entry creation error:', error)
        throw error
      } finally {
        connection.release()
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
  static async submit(id, userId) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Get entry details
        const entry = await this.getById(id)
        if (!entry) throw new Error('Stock entry not found')

        // Check for period closing lock
        await PeriodClosingModel.checkLock(connection, entry.entry_date)

        // Update status
        await connection.query(
          `UPDATE stock_entries SET status = 'Submitted', submitted_at = NOW(), approved_by = ? WHERE id = ?`,
          [userId, id]
        )

        // Process each item
        for (const item of entry.items) {
          const itemCode = item.item_code
          const itemQty = Number(item.qty) || 0
          const valuationRate = Number(item.valuation_rate) || 0

          const transactionTypeMap = {
            'Material Receipt': 'Receipt',
            'Material Issue': 'Issue',
            'Material Transfer': 'Transfer',
            'Manufacturing Return': 'Manufacturing Return',
            'Repack': 'Repack',
            'Scrap Entry': 'Scrap Entry'
          }
          const transactionType = transactionTypeMap[entry.entry_type] || entry.entry_type

          // 1. Handle Outward movement (Issue, Transfer, Scrap, Repack)
          if (['Material Issue', 'Material Transfer', 'Scrap Entry', 'Repack'].includes(entry.entry_type)) {
            const fromWarehouseId = entry.from_warehouse_id
            if (!fromWarehouseId) throw new Error(`Source warehouse is required for ${entry.entry_type}`)

            // Get current stock at source for valuation
            const sourceBalance = await StockBalanceModel.getByItemAndWarehouse(itemCode, fromWarehouseId)
            const currentValuation = sourceBalance ? Number(sourceBalance.valuation_rate) : valuationRate

            // Deduct from Source
            await StockBalanceModel.upsert(itemCode, fromWarehouseId, {
              current_qty: -itemQty,
              is_increment: true,
              last_issue_date: entry.entry_date
            }, connection)

            // Add Ledger Entry (OUT)
            await StockLedgerModel.create({
              item_code: itemCode,
              warehouse_id: fromWarehouseId,
              transaction_date: entry.entry_date,
              transaction_type: transactionType,
              qty_in: 0,
              qty_out: itemQty,
              valuation_rate: currentValuation,
              reference_doctype: 'Stock Entry',
              reference_name: entry.entry_no,
              remarks: entry.remarks,
              created_by: userId
            }, connection)
          }

          // 2. Handle Inward movement (Receipt, Transfer, Manufacturing Return, Repack)
          if (['Material Receipt', 'Material Transfer', 'Manufacturing Return', 'Repack'].includes(entry.entry_type)) {
            const toWarehouseId = entry.to_warehouse_id
            if (!toWarehouseId) throw new Error(`Target warehouse is required for ${entry.entry_type}`)

            // Add to Target
            await StockBalanceModel.upsert(itemCode, toWarehouseId, {
              current_qty: itemQty,
              is_increment: true,
              incoming_rate: valuationRate,
              last_receipt_date: entry.entry_date
            }, connection)

            // Add Ledger Entry (IN)
            await StockLedgerModel.create({
              item_code: itemCode,
              warehouse_id: toWarehouseId,
              transaction_date: entry.entry_date,
              transaction_type: transactionType,
              qty_in: itemQty,
              qty_out: 0,
              valuation_rate: valuationRate,
              reference_doctype: 'Stock Entry',
              reference_name: entry.entry_no,
              remarks: entry.remarks,
              created_by: userId
            }, connection)
          }
        }

        await connection.commit()
        return this.getById(id)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to submit stock entry: ${error.message}`)
    }
  }

  // Cancel stock entry
  static async cancel(id, userId) {
    try {
      const db = this.getDb()
      await db.query(
        `UPDATE stock_entries SET status = 'Cancelled', updated_by = ? WHERE id = ?`,
        [userId, id]
      )
      return this.getById(id)
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
