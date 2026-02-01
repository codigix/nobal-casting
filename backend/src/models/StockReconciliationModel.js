import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'

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
          cu.full_name as created_by_user,
          su.full_name as submitted_by_user
        FROM stock_reconciliation sr
        JOIN warehouses w ON sr.warehouse_id = w.id
        LEFT JOIN users cu ON sr.created_by = cu.user_id
        LEFT JOIN users su ON sr.submitted_by = su.user_id
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
          i.name as item_name,
          i.uom
        FROM stock_reconciliation_items sri
        JOIN item i ON sri.item_code = i.item_code
        WHERE sri.stock_reconciliation_id = ?`,
        [id]
      )

      // Map schema field names to model field names for backward compatibility if needed
      reconciliation.items = items.map(item => ({
        ...item,
        item_id: item.item_code, // Using item_code as ID
        variance_qty: item.difference,
        variance_reason: item.remarks
      }))
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
          const variancePercentage = item.system_qty !== 0 ? (varianceQty / item.system_qty) * 100 : 0

          await connection.query(
            `INSERT INTO stock_reconciliation_items (
              stock_reconciliation_id, item_code, system_qty, physical_qty, 
              difference, variance_percentage, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              reconciliationId, item.item_code || item.item_id, item.system_qty, item.physical_qty,
              varianceQty, variancePercentage, item.remarks || item.variance_reason
            ]
          )
        }

        // Update reconciliation totals
        await connection.query(
          `UPDATE stock_reconciliation 
          SET total_items = ?
          WHERE id = ?`,
          [items.length, reconciliationId]
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
        SET status = 'Submitted', submitted_by = ?, submitted_at = NOW()
        WHERE id = ? AND status = 'Draft'`,
        [userId, id]
      )
      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to submit reconciliation: ${error.message}`)
    }
  }

  // Approve reconciliation and update stock
  static async approve(id, userId) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Update reconciliation status
        await connection.query(
          `UPDATE stock_reconciliation 
          SET status = 'Completed'
          WHERE id = ?`,
          [id]
        )

        // Get reconciliation
        const reconciliation = await this.getById(id)

        // Process each variance
        for (const item of reconciliation.items) {
          if (item.variance_qty !== 0) {
            // Create adjustment stock ledger entry using standardized model
            await StockLedgerModel.create({
              item_code: item.item_code,
              warehouse_id: reconciliation.warehouse_id,
              transaction_date: reconciliation.reconciliation_date,
              transaction_type: 'Reconciliation',
              qty_in: item.variance_qty > 0 ? item.variance_qty : 0,
              qty_out: item.variance_qty < 0 ? Math.abs(item.variance_qty) : 0,
              valuation_rate: item.valuation_rate || 0,
              reference_doctype: 'Stock Reconciliation',
              reference_name: reconciliation.reconciliation_no,
              remarks: `Adjustment: ${item.variance_reason || ''}`,
              created_by: userId
            }, connection)

            // Update stock balance using standardized upsert
            // For reconciliation, we use is_increment: true to adjust by the variance
            await StockBalanceModel.upsert(
              item.item_code,
              reconciliation.warehouse_id,
              {
                current_qty: item.variance_qty,
                is_increment: true,
                incoming_rate: item.variance_qty > 0 ? (item.valuation_rate || 0) : null,
                last_receipt_date: item.variance_qty > 0 ? reconciliation.reconciliation_date : null,
                last_issue_date: item.variance_qty < 0 ? reconciliation.reconciliation_date : null
              },
              connection
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
          SUM(sri.difference) as total_variance_qty
        FROM stock_reconciliation sr
        JOIN warehouses w ON sr.warehouse_id = w.id
        LEFT JOIN stock_reconciliation_items sri ON sr.id = sri.stock_reconciliation_id
        WHERE sr.status = 'Completed'
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

      query += ' GROUP BY w.id ORDER BY total_variance_qty DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch variance summary: ${error.message}`)
    }
  }
}

export default StockReconciliationModel

