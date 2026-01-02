class StockMovementModel {
  static getDb() {
    return global.db
  }

  // Get all stock movements
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          sm.*,
          i.item_code,
          i.name as item_name,
          w.warehouse_name,
          cu.full_name as created_by_user,
          au.full_name as approved_by_user
        FROM stock_movements sm
        LEFT JOIN item i ON sm.item_code = i.item_code
        LEFT JOIN warehouses w ON sm.warehouse_id = w.id
        LEFT JOIN users cu ON sm.created_by = cu.user_id
        LEFT JOIN users au ON sm.approved_by = au.user_id
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND sm.status = ?'
        params.push(filters.status)
      }

      if (filters.movementType) {
        query += ' AND sm.movement_type = ?'
        params.push(filters.movementType)
      }

      if (filters.warehouseId) {
        query += ' AND sm.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      if (filters.itemCode) {
        query += ' AND sm.item_code = ?'
        params.push(filters.itemCode)
      }

      if (filters.startDate) {
        query += ' AND DATE(sm.created_at) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(sm.created_at) <= ?'
        params.push(filters.endDate)
      }

      if (filters.search) {
        query += ' AND sm.transaction_no LIKE ?'
        params.push(`%${filters.search}%`)
      }

      query += ' ORDER BY sm.created_at DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch stock movements: ${error.message}`)
    }
  }

  // Get stock movement by ID
  static async getById(id) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        `SELECT 
          sm.*,
          i.item_code,
          i.name as item_name,
          w.warehouse_name,
          cu.full_name as created_by_user,
          au.full_name as approved_by_user
        FROM stock_movements sm
        LEFT JOIN item i ON sm.item_code = i.item_code
        LEFT JOIN warehouses w ON sm.warehouse_id = w.id
        LEFT JOIN users cu ON sm.created_by = cu.user_id
        LEFT JOIN users au ON sm.approved_by = au.user_id
        WHERE sm.id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch stock movement: ${error.message}`)
    }
  }

  // Create stock movement
  static async create(data) {
    try {
      const db = this.getDb()
      const {
        transaction_no,
        item_code,
        warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_name,
        notes,
        created_by
      } = data

      const [result] = await db.query(
        `INSERT INTO stock_movements (
          transaction_no, item_code, warehouse_id, movement_type, quantity,
          reference_type, reference_name, notes, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [transaction_no, item_code, warehouse_id, movement_type, quantity, reference_type, reference_name, notes, created_by]
      )

      return this.getById(result.insertId)
    } catch (error) {
      throw new Error(`Failed to create stock movement: ${error.message}`)
    }
  }

  // Approve stock movement
  static async approve(id, userId) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Get movement details
        const movement = await this.getById(id)
        if (!movement) {
          throw new Error('Stock movement not found')
        }

        // Update movement status
        await connection.query(
          `UPDATE stock_movements SET status = 'Approved', approved_by = ?, approved_at = NOW() WHERE id = ?`,
          [userId, id]
        )

        // Create stock ledger entry
        const qty_in = movement.movement_type === 'IN' ? movement.quantity : 0
        const qty_out = movement.movement_type === 'OUT' ? movement.quantity : 0

        await connection.query(
          `INSERT INTO stock_ledger (
            item_code, warehouse_id, transaction_date, transaction_type,
            qty_in, qty_out, reference_doctype, reference_name, remarks, created_by
          ) VALUES (?, ?, NOW(), ?, ?, ?, 'Stock Movement', ?, ?, ?)`,
          [movement.item_code, movement.warehouse_id, movement.movement_type, qty_in, qty_out, movement.transaction_no, movement.notes, userId]
        )

        // Update stock balance
        const currentBalance = await connection.query(
          `SELECT current_qty FROM stock_balance WHERE item_code = ? AND warehouse_id = ?`,
          [movement.item_code, movement.warehouse_id]
        )

        const currentQty = currentBalance[0]?.[0]?.current_qty || 0
        const newQty = qty_in > 0 ? currentQty + qty_in : currentQty - qty_out

        if (currentBalance[0]?.length > 0) {
          await connection.query(
            `UPDATE stock_balance SET current_qty = ? WHERE item_code = ? AND warehouse_id = ?`,
            [newQty, movement.item_code, movement.warehouse_id]
          )
        } else {
          const item = await connection.query(
            `SELECT uom FROM item WHERE item_code = ?`,
            [movement.item_code]
          )
          await connection.query(
            `INSERT INTO stock_balance (item_code, warehouse_id, current_qty, uom) VALUES (?, ?, ?, ?)`,
            [movement.item_code, movement.warehouse_id, newQty, item[0]?.[0]?.uom || 'Kg']
          )
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
      throw new Error(`Failed to approve stock movement: ${error.message}`)
    }
  }

  // Reject stock movement
  static async reject(id, userId, reason) {
    try {
      const db = this.getDb()
      await db.query(
        `UPDATE stock_movements SET status = 'Cancelled', approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?`,
        [userId, reason, id]
      )
      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to reject stock movement: ${error.message}`)
    }
  }

  // Generate next transaction number
  static async generateTransactionNo() {
    try {
      const db = this.getDb()
      const date = new Date()
      const dateStr = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0')
      
      const [result] = await db.query(
        `SELECT MAX(CAST(SUBSTRING(transaction_no, -5) AS UNSIGNED)) as max_no 
        FROM stock_movements 
        WHERE transaction_no LIKE ?`,
        [`STK-${dateStr}-%`]
      )

      const nextNo = (result[0].max_no || 0) + 1
      return `STK-${dateStr}-${String(nextNo).padStart(5, '0')}`
    } catch (error) {
      throw new Error(`Failed to generate transaction number: ${error.message}`)
    }
  }

  // Get pending approvals count
  static async getPendingCount() {
    try {
      const db = this.getDb()
      const [result] = await db.query(
        `SELECT COUNT(*) as count FROM stock_movements WHERE status = 'Pending'`
      )
      return result[0].count
    } catch (error) {
      throw new Error(`Failed to get pending count: ${error.message}`)
    }
  }
}

export default StockMovementModel
