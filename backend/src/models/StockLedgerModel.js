class StockLedgerModel {
  static getDb() {
    return global.db
  }

  // Get all stock ledger entries
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          sl.*,
          sl.transaction_date as posting_date,
          i.name as item_name,
          w.warehouse_code,
          w.warehouse_name
        FROM stock_ledger sl
        LEFT JOIN item i ON sl.item_code = i.item_code
        LEFT JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE 1=1
      `
      const params = []

      if (filters.itemCode) {
        query += ' AND sl.item_code = ?'
        params.push(filters.itemCode)
      }

      if (filters.warehouseId) {
        query += ' AND sl.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      if (filters.transactionType) {
        query += ' AND sl.transaction_type = ?'
        params.push(filters.transactionType)
      }

      if (filters.startDate) {
        query += ' AND DATE(sl.transaction_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(sl.transaction_date) <= ?'
        params.push(filters.endDate)
      }

      if (filters.department && filters.department !== 'all') {
        query += ' AND (w.department = ? OR w.department = "all")'
        params.push(filters.department)
      }

      if (filters.search) {
        query += ' AND (sl.item_code LIKE ? OR i.name LIKE ?)'
        const searchTerm = `%${filters.search}%`
        params.push(searchTerm, searchTerm)
      }

      query += ' ORDER BY sl.transaction_date DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch stock ledger: ${error.message}`)
    }
  }

  // Create stock ledger entry
  static async create(data, dbConnection = null) {
    try {
      const db = dbConnection || this.getDb()
      const {
        item_code,
        warehouse_id,
        transaction_date,
        transaction_type,
        qty_in,
        qty_out,
        valuation_rate,
        reference_doctype,
        reference_name,
        remarks,
        created_by
      } = data

      // Get current balance
      const [rows] = await db.query(
        `SELECT balance_qty FROM stock_ledger 
        WHERE item_code = ? AND warehouse_id = ? 
        ORDER BY transaction_date DESC, id DESC LIMIT 1`,
        [item_code, warehouse_id]
      )

      const previousBalance = rows.length > 0 ? rows[0].balance_qty : 0
      const balance_qty = Number(previousBalance) + (Number(qty_in) || 0) - (Number(qty_out) || 0)
      
      let final_valuation_rate = valuation_rate
      if ((!final_valuation_rate || Number(final_valuation_rate) === 0) && Number(qty_out) > 0) {
        // Fetch item's valuation method
        const [itemRows] = await db.query('SELECT valuation_method FROM item WHERE item_code = ?', [item_code])
        const method = itemRows.length > 0 ? itemRows[0].valuation_method : 'FIFO'
        
        final_valuation_rate = await this.getValuationRate(item_code, warehouse_id, Number(qty_out), method, db)
      }

      const transaction_value = (Number(qty_in) || Number(qty_out)) * Number(final_valuation_rate || 0)

      const [result] = await db.query(
        `INSERT INTO stock_ledger (
          item_code, warehouse_id, transaction_date, transaction_type, 
          qty_in, qty_out, balance_qty, valuation_rate, transaction_value,
          reference_doctype, reference_name, remarks, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item_code, warehouse_id, transaction_date, transaction_type,
          qty_in, qty_out, balance_qty, final_valuation_rate, transaction_value,
          reference_doctype, reference_name, remarks, created_by
        ]
      )

      return this.getById(result.insertId, db)
    } catch (error) {
      throw new Error(`Failed to create stock ledger entry: ${error.message}`)
    }
  }

  // Get stock ledger by ID
  static async getById(id, dbConnection = null) {
    try {
      const db = dbConnection || this.getDb()
      const [rows] = await db.query(
        `SELECT 
          sl.*,
          sl.transaction_date as posting_date,
          i.name as item_name,
          w.warehouse_code,
          w.warehouse_name
        FROM stock_ledger sl
        LEFT JOIN item i ON sl.item_code = i.item_code
        LEFT JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE sl.id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch stock ledger entry: ${error.message}`)
    }
  }

  // Get item stock movement history
  static async getItemMovementHistory(itemCode, warehouseId, limit = 100) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        `SELECT * FROM stock_ledger 
        WHERE item_code = ? AND warehouse_id = ?
        ORDER BY transaction_date DESC
        LIMIT ?`,
        [itemCode, warehouseId, limit]
      )
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch movement history: ${error.message}`)
    }
  }

  // Get daily stock consumption report
  static async getDailyConsumptionReport(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          DATE(sl.transaction_date) as transaction_date,
          sl.transaction_type,
          COUNT(*) as transaction_count,
          SUM(sl.qty_in) as total_in,
          SUM(sl.qty_out) as total_out,
          SUM(sl.transaction_value) as total_value
        FROM stock_ledger sl
        WHERE 1=1
      `
      const params = []

      if (filters.warehouseId) {
        query += ' AND sl.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      if (filters.startDate) {
        query += ' AND DATE(sl.transaction_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(sl.transaction_date) <= ?'
        params.push(filters.endDate)
      }

      if (filters.department && filters.department !== 'all') {
        // Join with warehouse to filter by department
        query = query.replace('FROM stock_ledger sl', 
          `FROM stock_ledger sl
          JOIN warehouses w ON sl.warehouse_id = w.id`)
        query += ' AND (w.department = ? OR w.department = "all")'
        params.push(filters.department)
      }

      query += ' GROUP BY DATE(sl.transaction_date), sl.transaction_type ORDER BY transaction_date DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch consumption report: ${error.message}`)
    }
  }

  // Get stock valuation report
  static async getStockValuationReport(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          i.item_code,
          i.name as item_name,
          w.warehouse_code,
          w.warehouse_name,
          SUM(CASE WHEN sl.transaction_type IN ('Purchase Receipt', 'Manufacturing Return', 'Production', 'Production Receipt', 'Rejection', 'Scrap', 'Subcontract Receipt', 'Subcontract Rejection') THEN sl.qty_in ELSE 0 END) as total_received,
          SUM(CASE WHEN sl.transaction_type IN ('Issue', 'Transfer', 'Consumption', 'Manufacturing Issue', 'Subcontract Dispatch') THEN sl.qty_out ELSE 0 END) as total_issued,
          AVG(sl.valuation_rate) as avg_rate,
          SUM(sl.transaction_value) as total_value
        FROM stock_ledger sl
        LEFT JOIN item i ON sl.item_code = i.item_code
        JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE 1=1
      `
      const params = []

      if (filters.department && filters.department !== 'all') {
        query += ' AND (w.department = ? OR w.department = "all")'
        params.push(filters.department)
      }

      if (filters.startDate) {
        query += ' AND DATE(sl.transaction_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(sl.transaction_date) <= ?'
        params.push(filters.endDate)
      }

      query += ' GROUP BY i.item_code, w.id ORDER BY total_value DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch valuation report: ${error.message}`)
    }
  }

  // Get transaction types summary
  static async getTransactionSummary(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          sl.transaction_type,
          COUNT(*) as count,
          SUM(sl.qty_in) as total_in,
          SUM(sl.qty_out) as total_out,
          SUM(sl.transaction_value) as total_value
        FROM stock_ledger sl
        JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE 1=1
      `
      const params = []

      if (filters.department && filters.department !== 'all') {
        query += ' AND (w.department = ? OR w.department = "all")'
        params.push(filters.department)
      }

      if (filters.startDate) {
        query += ' AND DATE(sl.transaction_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(sl.transaction_date) <= ?'
        params.push(filters.endDate)
      }

      query += ' GROUP BY sl.transaction_type'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch transaction summary: ${error.message}`)
    }
  }

  /**
   * Calculate valuation rate based on the item's valuation method
   */
  static async getValuationRate(itemCode, warehouseId, qtyToIssue, method, dbConnection = null) {
    try {
      const db = dbConnection || this.getDb()
      
      // Default to item's valuation rate if qty is 0
      if (qtyToIssue <= 0) {
        const [rows] = await db.query(
          'SELECT valuation_rate FROM stock_balance WHERE item_code = ? AND warehouse_id = ?',
          [itemCode, warehouseId]
        )
        if (rows.length > 0) return Number(rows[0].valuation_rate)
        
        const [item] = await db.query('SELECT valuation_rate FROM item WHERE item_code = ?', [itemCode])
        return item.length > 0 ? Number(item[0].valuation_rate) : 0
      }

      if (method === 'Moving Average') {
        const [rows] = await db.query(
          'SELECT valuation_rate FROM stock_balance WHERE item_code = ? AND warehouse_id = ?',
          [itemCode, warehouseId]
        )
        return rows.length > 0 ? Number(rows[0].valuation_rate) : 0
      }

      // For FIFO and LIFO, we need to traverse the ledger
      const [inEntries] = await db.query(
        `SELECT qty_in, valuation_rate, transaction_date, id 
         FROM stock_ledger 
         WHERE item_code = ? AND warehouse_id = ? AND qty_in > 0 
         ORDER BY transaction_date ASC, id ASC`,
        [itemCode, warehouseId]
      )

      const [outEntries] = await db.query(
        `SELECT SUM(qty_out) as total_out 
         FROM stock_ledger 
         WHERE item_code = ? AND warehouse_id = ? AND qty_out > 0`,
        [itemCode, warehouseId]
      )

      let totalConsumed = Number(outEntries[0].total_out || 0)
      let remainingQtyToIssue = Number(qtyToIssue)
      let totalValue = 0

      if (method === 'FIFO') {
        for (const entry of inEntries) {
          const availableInBatch = Number(entry.qty_in)
          
          if (totalConsumed >= availableInBatch) {
            totalConsumed -= availableInBatch
            continue
          }

          const usableFromBatch = availableInBatch - totalConsumed
          totalConsumed = 0 

          const taken = Math.min(usableFromBatch, remainingQtyToIssue)
          totalValue += taken * Number(entry.valuation_rate)
          remainingQtyToIssue -= taken

          if (remainingQtyToIssue <= 0) break
        }
      } else if (method === 'LIFO') {
        const reversedInEntries = [...inEntries].reverse()
        // Simplified LIFO: assume total_out consumed the latest ones first
        let tempTotalConsumed = Number(outEntries[0].total_out || 0)
        
        for (const entry of reversedInEntries) {
          const availableInBatch = Number(entry.qty_in)
          
          if (tempTotalConsumed >= availableInBatch) {
            tempTotalConsumed -= availableInBatch
            continue
          }
          
          const usableFromBatch = availableInBatch - tempTotalConsumed
          tempTotalConsumed = 0
          
          const taken = Math.min(usableFromBatch, remainingQtyToIssue)
          totalValue += taken * Number(entry.valuation_rate)
          remainingQtyToIssue -= taken
          
          if (remainingQtyToIssue <= 0) break
        }
      }

      if (qtyToIssue > 0 && remainingQtyToIssue < qtyToIssue) {
        return totalValue / (qtyToIssue - remainingQtyToIssue)
      }

      // Fallback
      const [item] = await db.query('SELECT valuation_rate FROM item WHERE item_code = ?', [itemCode])
      return item.length > 0 ? Number(item[0].valuation_rate) : 0
    } catch (error) {
      console.error('Error calculating valuation rate:', error)
      return 0
    }
  }
}

export default StockLedgerModel

