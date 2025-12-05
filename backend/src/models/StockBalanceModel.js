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
          w.warehouse_name
        FROM stock_balance sb
        LEFT JOIN item i ON sb.item_code = i.item_code
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
        WHERE 1=1
      `

      if (filters.warehouseId) {
        query += ' AND sb.warehouse_id = ?'
        params.push(filters.warehouseId)
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

      query += ' ORDER BY i.item_code ASC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch stock balances: ${error.message}`)
    }
  }

  // Get stock balance by item and warehouse
  static async getByItemAndWarehouse(itemCode, warehouseId) {
    try {
      const db = this.getDb()
      
      const query = `SELECT sb.*, i.item_code, i.name as item_name, i.item_group, i.uom, w.warehouse_code, w.warehouse_name
                     FROM stock_balance sb
                     LEFT JOIN item i ON sb.item_code = i.item_code
                     LEFT JOIN warehouses w ON sb.warehouse_id = w.id
                     WHERE sb.item_code = ? AND sb.warehouse_id = ?`
      
      const [rows] = await db.query(query, [itemCode, warehouseId])
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch stock balance: ${error.message}`)
    }
  }

  // Create or update stock balance
  static async upsert(itemCode, warehouseId, data) {
    try {
      const db = this.getDb()
      const {
        current_qty = 0,
        reserved_qty = 0,
        valuation_rate = 0,
        last_receipt_date = null,
        last_issue_date = null
      } = data

      const available_qty = current_qty - reserved_qty
      const total_value = current_qty * valuation_rate

      const [result] = await db.query(
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
          itemCode, warehouseId, current_qty, reserved_qty, available_qty, 
          valuation_rate, total_value, last_receipt_date, last_issue_date,
          current_qty, reserved_qty, available_qty, valuation_rate, total_value,
          last_receipt_date, last_receipt_date, last_issue_date, last_issue_date
        ]
      )

      return this.getByItemAndWarehouse(itemCode, warehouseId)
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
          w.warehouse_name
        FROM stock_balance sb
        LEFT JOIN item i ON sb.item_code = i.item_code
        LEFT JOIN warehouses w ON sb.warehouse_id = w.id
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
      return this.getByItemAndWarehouse(itemCode, warehouseId)
    } catch (error) {
      throw new Error(`Failed to update available quantity: ${error.message}`)
    }
  }
}

export default StockBalanceModel