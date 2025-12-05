class StockReconciliationModel {
  static getDb() {
    return global.db
  }

  // Get all reconciliations
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          sr.*,
          w.warehouse_name,
          cu.username as created_by_user,
          au.username as approved_by_user
        FROM stock_reconciliation sr
        JOIN warehouses w ON sr.warehouse_id = w.id
        LEFT JOIN users cu ON sr.created_by = cu.id
        LEFT JOIN users au ON sr.approved_by = au.id
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND sr.status = ?'
        params.push(filters.status)
      }

      if (filters.warehouseId) {
        query += ' AND sr.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      if (filters.startDate) {
        query += ' AND DATE(sr.reconciliation_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(sr.reconciliation_date) <= ?'
        params.push(filters.endDate)
      }

      if (filters.search) {
        query += ' AND sr.reconciliation_no LIKE ?'
        params.push(`%${filters.search}%`)
      }

      query += ' ORDER BY sr.reconciliation_date DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch reconciliations: ${error.message}`)
    }
  }

  // Get reconciliation by ID
  static async getById(id) {
    try {
      const [recRows] = await db.query(
        `SELECT 
          sr.*,
          w.warehouse_name
        FROM stock_reconciliation sr
        JOIN warehouses w ON sr.warehouse_id = w.id
        WHERE sr.id = ?`,
        [id]
      )

      if (!recRows[0]) return null

      const reconciliation = recRows[0]

      // Get items
      const [items] = await db.query(
        `SELECT 
          sri.*,
          i.item_code,
          i.item_name,
          i.uom
        FROM stock_reconciliation_items sri
        JOIN items i ON sri.item_id = i.id
        WHERE sri.reconciliation_id = ?`,
        [id]
      )

      reconciliation.items = items
      return reconciliation
    } catch (error) {
      throw new Error(`Failed to fetch reconciliation: ${error.message}`)
    }
  }

  // Create reconciliation
  static async create(data) {
    try {
      const {
        reconciliation_no,
        reconciliation_date,
        warehouse_id,
        purpose,
        created_by
      } = data

      const [result] = await db.query(
        `INSERT INTO stock_reconciliation (
          reconciliation_no, reconciliation_date, warehouse_id, purpose,
          status, created_by
        ) VALUES (?, ?, ?, ?, 'Draft', ?)`,
        [reconciliation_no, reconciliation_date, warehouse_id, purpose, created_by]
      )

      return this.getById(result.insertId)
    } catch (error) {
      throw new Error(`Failed to create reconciliation: ${error.message}`)
    }
  }

  // Add reconciliation items
  static async addItems(reconciliationId, items) {
    try {
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        let varianceCount = 0
        let totalVarianceValue = 0

        for (const item of items) {
          const varianceQty = item.physical_qty - item.system_qty
          const varianceValue = varianceQty * (item.valuation_rate || 0)

          if (varianceQty !== 0) {
            varianceCount++
            totalVarianceValue += Math.abs(varianceValue)
          }

          await connection.query(
            `INSERT INTO stock_reconciliation_items (
              reconciliation_id, item_id, system_qty, physical_qty, 
              variance_qty, variance_reason, variance_value
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              reconciliationId, item.item_id, item.system_qty, item.physical_qty,
              varianceQty, item.variance_reason, varianceValue
            ]
          )
        }

        // Update reconciliation totals
        await connection.query(
          `UPDATE stock_reconciliation 
          SET total_items = ?, variance_count = ?, total_variance_value = ?
          WHERE id = ?`,
          [items.length, varianceCount, totalVarianceValue, reconciliationId]
        )

        await connection.commit()
        return this.getById(reconciliationId)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to add reconciliation items: ${error.message}`)
    }
  }

  // Submit reconciliation
  static async submit(id, userId) {
    try {
      await db.query(
        `UPDATE stock_reconciliation 
        SET status = 'Submitted' 
        WHERE id = ? AND status = 'Draft'`,
        [id]
      )
      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to submit reconciliation: ${error.message}`)
    }
  }

  // Approve reconciliation and update stock
  static async approve(id, userId) {
    try {
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Update reconciliation status
        await connection.query(
          `UPDATE stock_reconciliation 
          SET status = 'Approved', approved_by = ?
          WHERE id = ?`,
          [userId, id]
        )

        // Get reconciliation
        const reconciliation = await this.getById(id)

        // Process each variance
        for (const item of reconciliation.items) {
          if (item.variance_qty !== 0) {
            // Create adjustment stock ledger entry
            await connection.query(
              `INSERT INTO stock_ledger (
                item_id, warehouse_id, transaction_date, transaction_type,
                qty_in, qty_out, valuation_rate, reference_doctype, reference_name,
                remarks, created_by
              ) VALUES (?, ?, ?, 'Reconciliation', ?, ?, ?, 'Stock Reconciliation', ?, ?, ?)`,
              [
                item.item_id, reconciliation.warehouse_id, reconciliation.reconciliation_date,
                item.variance_qty > 0 ? item.variance_qty : 0,
                item.variance_qty < 0 ? Math.abs(item.variance_qty) : 0,
                item.variance_rate || 0, reconciliation.reconciliation_no,
                `Adjustment: ${item.variance_reason}`, userId
              ]
            )

            // Update stock balance
            const adjustment = item.variance_qty
            await connection.query(
              `UPDATE stock_balance 
              SET current_qty = current_qty + ?, available_qty = available_qty + ?
              WHERE item_id = ? AND warehouse_id = ?`,
              [adjustment, adjustment, item.item_id, reconciliation.warehouse_id]
            )
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
      throw new Error(`Failed to approve reconciliation: ${error.message}`)
    }
  }

  // Cancel reconciliation
  static async cancel(id, userId) {
    try {
      await db.query(
        `UPDATE stock_reconciliation 
        SET status = 'Cancelled'
        WHERE id = ?`,
        [id]
      )
      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to cancel reconciliation: ${error.message}`)
    }
  }

  // Generate reconciliation number
  static async generateReconciliationNo() {
    try {
      const date = new Date()
      const yearMonth = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0')
      
      const [result] = await db.query(
        `SELECT MAX(CAST(SUBSTRING(reconciliation_no, -6) AS UNSIGNED)) as max_no 
        FROM stock_reconciliation 
        WHERE reconciliation_no LIKE ?`,
        [`SR-${yearMonth}-%`]
      )

      const nextNo = (result[0].max_no || 0) + 1
      return `SR-${yearMonth}-${String(nextNo).padStart(6, '0')}`
    } catch (error) {
      throw new Error(`Failed to generate reconciliation number: ${error.message}`)
    }
  }

  // Get reconciliation variance summary
  static async getVarianceSummary(filters = {}) {
    try {
      let query = `
        SELECT 
          w.warehouse_name,
          COUNT(DISTINCT sr.id) as reconciliation_count,
          SUM(sri.variance_qty) as total_variance_qty,
          SUM(ABS(sri.variance_value)) as total_variance_value
        FROM stock_reconciliation sr
        JOIN warehouses w ON sr.warehouse_id = w.id
        LEFT JOIN stock_reconciliation_items sri ON sr.id = sri.reconciliation_id
        WHERE sr.status = 'Approved'
      `
      const params = []

      if (filters.startDate) {
        query += ' AND DATE(sr.reconciliation_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(sr.reconciliation_date) <= ?'
        params.push(filters.endDate)
      }

      query += ' GROUP BY w.id ORDER BY total_variance_value DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch variance summary: ${error.message}`)
    }
  }
}

export default StockReconciliationModel

