class StockBalanceModel {
  static getDb() {
    return global.db
  }

  // Get all stock balances with filters
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      const params = []
      let query = `
        SELECT 
          sb.*,
          i.item_code,
          i.name as item_name,
          i.item_group,
          i.uom,
          w.warehouse_code,
          w.warehouse_name,
          COALESCE(sl_in.total_in_qty, 0) as in_quantity,
          COALESCE(sl_in.total_in_value, 0) as in_value,
          COALESCE(sl_out.total_out_qty, 0) as out_quantity,
          COALESCE(sl_out.total_out_value, 0) as out_value
        FROM stock_balance sb
        LEFT JOIN item i ON sb.item_code = i.item_code
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        LEFT JOIN (
          SELECT item_code, warehouse_id, SUM(qty_in) as total_in_qty, SUM(transaction_value) as total_in_value
          FROM stock_ledger
          WHERE qty_in > 0
          GROUP BY item_code, warehouse_id
        ) sl_in ON sb.item_code = sl_in.item_code AND sb.warehouse_id = sl_in.warehouse_id
        LEFT JOIN (
          SELECT item_code, warehouse_id, SUM(qty_out) as total_out_qty, SUM(transaction_value) as total_out_value
          FROM stock_ledger
          WHERE qty_out > 0
          GROUP BY item_code, warehouse_id
        ) sl_out ON sb.item_code = sl_out.item_code AND sb.warehouse_id = sl_out.warehouse_id
        WHERE 1=1
      `

      if (filters.warehouseId) {
        if (Number.isInteger(Number(filters.warehouseId))) {
          query += ' AND sb.warehouse_id = ?'
          params.push(Number(filters.warehouseId))
        } else {
          query += ' AND (w.warehouse_code = ? OR w.warehouse_name = ?)'
          params.push(filters.warehouseId, filters.warehouseId)
        }
      }

      if (filters.itemCode) {
        query += ' AND i.item_code = ?'
        params.push(filters.itemCode)
      }

      if (filters.itemId) {
        query += ' AND i.item_code = ?'
        params.push(filters.itemId)
      }

      if (filters.department && filters.department !== 'all') {
        query += ' AND (w.department = ? OR w.department = "all")'
        params.push(filters.department)
      }

      if (filters.search) {
        query += ' AND (i.item_code LIKE ? OR i.name LIKE ?)'
        const searchTerm = `%${filters.search}%`
        params.push(searchTerm, searchTerm)
      }

      if (filters.isLocked !== undefined) {
        query += ' AND sb.is_locked = ?'
        params.push(filters.isLocked)
      }

      query += ' ORDER BY sb.updated_at DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch stock balances: ${error.message}`)
    }
  }

  // Get stock balance by item and warehouse
  static async getByItemAndWarehouse(itemCode, warehouseIdentifier, dbConnection = null) {
    try {
      const db = dbConnection || this.getDb()
      
      let whereClause = 'sb.item_code = ? AND '
      let params = [itemCode]
      
      if (Number.isInteger(Number(warehouseIdentifier))) {
        whereClause += 'sb.warehouse_id = ?'
        params.push(Number(warehouseIdentifier))
      } else {
        whereClause += '(w.warehouse_code = ? OR w.warehouse_name = ?)'
        params.push(warehouseIdentifier, warehouseIdentifier)
      }
      
      const query = `SELECT sb.*, i.item_code, i.name as item_name, i.item_group, i.uom, w.warehouse_code, w.warehouse_name,
                            COALESCE(sl_in.total_in_qty, 0) as in_quantity,
                            COALESCE(sl_in.total_in_value, 0) as in_value,
                            COALESCE(sl_out.total_out_qty, 0) as out_quantity,
                            COALESCE(sl_out.total_out_value, 0) as out_value
                     FROM stock_balance sb
                     LEFT JOIN item i ON sb.item_code = i.item_code
                     LEFT JOIN warehouses w ON sb.warehouse_id = w.id
                     LEFT JOIN (
                       SELECT item_code, warehouse_id, SUM(qty_in) as total_in_qty, SUM(transaction_value) as total_in_value
                       FROM stock_ledger
                       WHERE qty_in > 0
                       GROUP BY item_code, warehouse_id
                     ) sl_in ON sb.item_code = sl_in.item_code AND sb.warehouse_id = sl_in.warehouse_id
                     LEFT JOIN (
                       SELECT item_code, warehouse_id, SUM(qty_out) as total_out_qty, SUM(transaction_value) as total_out_value
                       FROM stock_ledger
                       WHERE qty_out > 0
                       GROUP BY item_code, warehouse_id
                     ) sl_out ON sb.item_code = sl_out.item_code AND sb.warehouse_id = sl_out.warehouse_id
                     WHERE ${whereClause}`
      
      const [rows] = await db.query(query, params)
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch stock balance: ${error.message}`)
    }
  }

  // Create or update stock balance with optional valuation update
  static async upsert(itemCode, warehouseId, data, dbConnection = null) {
    try {
      const db = dbConnection || this.getDb()
      const {
        current_qty = 0,
        reserved_qty = 0,
        valuation_rate = null, // If null, we'll try to calculate or keep existing
        last_receipt_date = null,
        last_issue_date = null,
        is_increment = false, // If true, current_qty and reserved_qty will be added to existing
        incoming_rate = null  // Used for Moving Average Calculation if is_increment is true
      } = data

      // Get existing record for valuation and reserved quantity calculation
      const [existing] = await db.query(
        'SELECT current_qty, reserved_qty, valuation_rate FROM stock_balance WHERE item_code = ? AND warehouse_id = ?',
        [itemCode, warehouseId]
      )

      let final_qty = current_qty
      let final_valuation = valuation_rate
      let final_reserved = reserved_qty

      if (existing && existing.length > 0) {
        const old_qty = Number(existing[0].current_qty || 0)
        const old_rate = Number(existing[0].valuation_rate || 0)
        const old_reserved = Number(existing[0].reserved_qty || 0)
        
        if (is_increment) {
          final_qty = old_qty + current_qty
          final_reserved = Math.max(0, old_reserved + reserved_qty)
          // Moving Average Valuation: ((old_qty * old_rate) + (incoming_qty * incoming_rate)) / (old_qty + incoming_qty)
          if (incoming_rate !== null && final_qty > 0) {
            final_valuation = ((old_qty * old_rate) + (current_qty * incoming_rate)) / final_qty
          } else {
            final_valuation = old_rate
          }
        } else if (valuation_rate === null) {
          final_valuation = old_rate
        }
      } else {
        // New record
        if (valuation_rate === null) final_valuation = incoming_rate || 0
      }

      const available_qty = final_qty - final_reserved
      const total_value = final_qty * (final_valuation || 0)

      await db.query(
        `INSERT INTO stock_balance 
          (item_code, warehouse_id, current_qty, reserved_qty, available_qty, valuation_rate, total_value, last_receipt_date, last_issue_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          current_qty = ?,
          reserved_qty = ?,
          available_qty = ?,
          valuation_rate = ?,
          total_value = ?,
          last_receipt_date = IF(? IS NOT NULL, ?, last_receipt_date),
          last_issue_date = IF(? IS NOT NULL, ?, last_issue_date),
          updated_at = CURRENT_TIMESTAMP`,
        [
          itemCode, warehouseId, final_qty, final_reserved, available_qty, 
          final_valuation, total_value, last_receipt_date, last_issue_date,
          final_qty, final_reserved, available_qty, final_valuation, total_value,
          last_receipt_date, last_receipt_date, last_issue_date, last_issue_date
        ]
      )

      // Sync valuation_rate to item table (Weighted Average across all warehouses)
      try {
        await db.query(`
          UPDATE item i
          JOIN (
            SELECT item_code, 
                   CASE 
                     WHEN SUM(current_qty) > 0 THEN SUM(current_qty * valuation_rate) / SUM(current_qty)
                     ELSE MAX(valuation_rate)
                   END as avg_rate
            FROM stock_balance
            WHERE item_code = ?
            GROUP BY item_code
          ) sb_avg ON i.item_code = sb_avg.item_code
          SET i.valuation_rate = sb_avg.avg_rate
          WHERE i.item_code = ?
        `, [itemCode, itemCode])
      } catch (syncError) {
        console.error('Failed to sync valuation_rate to item table:', syncError)
      }

      return this.getByItemAndWarehouse(itemCode, warehouseId, db)
    } catch (error) {
      throw new Error(`Failed to update stock balance: ${error.message}`)
    }
  }

  // Get low stock items
  static async getLowStockItems(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          sb.*,
          i.item_name,
          w.warehouse_code,
          w.warehouse_name,
          COALESCE(sl_in.total_in_qty, 0) as in_quantity,
          COALESCE(sl_in.total_in_value, 0) as in_value,
          COALESCE(sl_out.total_out_qty, 0) as out_quantity,
          COALESCE(sl_out.total_out_value, 0) as out_value
        FROM stock_balance sb
        LEFT JOIN item i ON sb.item_code = i.item_code
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        LEFT JOIN (
          SELECT item_code, warehouse_id, SUM(qty_in) as total_in_qty, SUM(transaction_value) as total_in_value
          FROM stock_ledger
          WHERE qty_in > 0
          GROUP BY item_code, warehouse_id
        ) sl_in ON sb.item_code = sl_in.item_code AND sb.warehouse_id = sl_in.warehouse_id
        LEFT JOIN (
          SELECT item_code, warehouse_id, SUM(qty_out) as total_out_qty, SUM(transaction_value) as total_out_value
          FROM stock_ledger
          WHERE qty_out > 0
          GROUP BY item_code, warehouse_id
        ) sl_out ON sb.item_code = sl_out.item_code AND sb.warehouse_id = sl_out.warehouse_id
        WHERE sb.available_qty > 0
      `
      const params = []

      if (filters.department && filters.department !== 'all') {
        query += ' AND (w.department = ? OR w.department = "all")'
        params.push(filters.department)
      }

      if (filters.warehouseId) {
        query += ' AND sb.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      query += ' ORDER BY sb.available_qty ASC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch low stock items: ${error.message}`)
    }
  }

  // Get stock value summary
  static async getStockValueSummary(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          w.id,
          w.warehouse_code,
          w.warehouse_name,
          COUNT(DISTINCT sb.item_code) as total_items,
          SUM(sb.current_qty) as total_qty,
          SUM(sb.total_value) as total_value,
          AVG(sb.valuation_rate) as avg_rate
        FROM stock_balance sb
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        WHERE 1=1
      `
      const params = []

      if (filters.department && filters.department !== 'all') {
        query += ' AND (w.department = ? OR w.department = "all")'
        params.push(filters.department)
      }

      query += ' GROUP BY w.id ORDER BY total_value DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch stock value summary: ${error.message}`)
    }
  }

  // Lock warehouse stock during reconciliation
  static async lockWarehouseStock(warehouseId, reason, userId) {
    try {
      const db = this.getDb()
      const [result] = await db.query(
        `UPDATE stock_balance 
        SET is_locked = TRUE, locked_reason = ?, locked_by = ?, locked_at = NOW()
        WHERE warehouse_id = ?`,
        [reason, userId, warehouseId]
      )
      return result.affectedRows
    } catch (error) {
      throw new Error(`Failed to lock warehouse stock: ${error.message}`)
    }
  }

  // Unlock warehouse stock
  static async unlockWarehouseStock(warehouseId) {
    try {
      const db = this.getDb()
      const [result] = await db.query(
        `UPDATE stock_balance 
        SET is_locked = FALSE, locked_reason = NULL, locked_by = NULL, locked_at = NULL
        WHERE warehouse_id = ?`,
        [warehouseId]
      )
      return result.affectedRows
    } catch (error) {
      throw new Error(`Failed to unlock warehouse stock: ${error.message}`)
    }
  }

  // Update available quantity (for reservations)
  static async updateAvailableQty(itemCode, warehouseId, qty, operation = 'subtract') {
    try {
      const db = this.getDb()
      
      const sign = operation === 'subtract' ? '-' : '+'
      await db.query(
        `UPDATE stock_balance 
        SET available_qty = available_qty ${sign} ?, updated_at = CURRENT_TIMESTAMP
        WHERE item_code = ? AND warehouse_id = ?`,
        [qty, itemCode, warehouseId]
      )
      return this.getByItemAndWarehouse(itemCode, warehouseId, db)
    } catch (error) {
      throw new Error(`Failed to update available quantity: ${error.message}`)
    }
  }
}

export default StockBalanceModel