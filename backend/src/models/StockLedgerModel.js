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
  static async create(data) {
    try {
      const db = this.getDb()
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
      const [lastEntry] = await db.query(
        `SELECT balance_qty FROM stock_ledger 
        WHERE item_code = ? AND warehouse_id = ? 
        ORDER BY transaction_date DESC, id DESC LIMIT 1`,
        [item_code, warehouse_id]
      )

      const previousBalance = lastEntry ? lastEntry[0].balance_qty : 0
      const balance_qty = previousBalance + (qty_in || 0) - (qty_out || 0)
      const transaction_value = (qty_in || qty_out) * valuation_rate

      const [result] = await db.query(
        `INSERT INTO stock_ledger (
          item_code, warehouse_id, transaction_date, transaction_type, 
          qty_in, qty_out, balance_qty, valuation_rate, transaction_value,
          reference_doctype, reference_name, remarks, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item_code, warehouse_id, transaction_date, transaction_type,
          qty_in, qty_out, balance_qty, valuation_rate, transaction_value,
          reference_doctype, reference_name, remarks, created_by
        ]
      )

      return this.getById(result.insertId)
    } catch (error) {
      throw new Error(`Failed to create stock ledger entry: ${error.message}`)
    }
  }

  // Get stock ledger by ID
  static async getById(id) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        `SELECT 
          sl.*,
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
          SUM(CASE WHEN sl.transaction_type IN ('Purchase Receipt', 'Manufacturing Return') THEN sl.qty_in ELSE 0 END) as total_received,
          SUM(CASE WHEN sl.transaction_type IN ('Issue', 'Transfer') THEN sl.qty_out ELSE 0 END) as total_issued,
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
}

export default StockLedgerModel

