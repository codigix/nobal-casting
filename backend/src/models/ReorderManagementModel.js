class ReorderManagementModel {
  static getDb() {
    return global.db
  }

  // Get all reorder requests
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          rm.*,
          COUNT(ri.id) as item_count,
          SUM(ri.qty_to_order) as total_qty_to_order
        FROM reorder_management rm
        LEFT JOIN reorder_items ri ON rm.id = ri.reorder_id
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND rm.status = ?'
        params.push(filters.status)
      }

      if (filters.startDate) {
        query += ' AND DATE(rm.request_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(rm.request_date) <= ?'
        params.push(filters.endDate)
      }

      query += ' GROUP BY rm.id ORDER BY rm.request_date DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch reorder requests: ${error.message}`)
    }
  }

  // Get reorder request by ID
  static async getById(id) {
    try {
      const [reorderRows] = await db.query(
        'SELECT * FROM reorder_management WHERE id = ?',
        [id]
      )

      if (!reorderRows[0]) return null

      const reorder = reorderRows[0]

      // Get items
      const [items] = await db.query(
        `SELECT 
          ri.*,
          i.item_code,
          i.item_name,
          i.uom,
          i.reorder_level,
          i.reorder_qty
        FROM reorder_items ri
        JOIN items i ON ri.item_id = i.id
        WHERE ri.reorder_id = ?`,
        [id]
      )

      reorder.items = items
      return reorder
    } catch (error) {
      throw new Error(`Failed to fetch reorder request: ${error.message}`)
    }
  }

  // Generate reorder request for low stock items
  static async generateReorderRequest(filters = {}) {
    try {
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Get low stock items
        const [lowStockItems] = await connection.query(
          `SELECT 
            sb.item_id,
            sb.warehouse_id,
            i.reorder_level,
            i.reorder_qty,
            sb.current_qty,
            (i.reorder_level - sb.current_qty) as qty_to_order,
            i.item_code,
            i.item_name
          FROM stock_balance sb
          JOIN items i ON sb.item_id = i.id
          WHERE sb.current_qty < i.reorder_level
          AND i.is_purchasable = TRUE`,
          []
        )

        if (lowStockItems.length === 0) {
          throw new Error('No items below reorder level')
        }

        // Generate reorder number
        const date = new Date()
        const yearMonth = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0')
        
        const [result] = await connection.query(
          `SELECT MAX(CAST(SUBSTRING(reorder_request_no, -6) AS UNSIGNED)) as max_no 
          FROM reorder_management 
          WHERE reorder_request_no LIKE ?`,
          [`RR-${yearMonth}-%`]
        )

        const nextNo = (result[0].max_no || 0) + 1
        const reorderNo = `RR-${yearMonth}-${String(nextNo).padStart(6, '0')}`

        // Create reorder request
        const [reorderResult] = await connection.query(
          `INSERT INTO reorder_management (
            reorder_request_no, request_date, status, total_items
          ) VALUES (?, NOW(), 'Generated', ?)`,
          [reorderNo, lowStockItems.length]
        )

        const reorderId = reorderResult.insertId

        // Add items to reorder
        for (const item of lowStockItems) {
          await connection.query(
            `INSERT INTO reorder_items (
              reorder_id, item_id, warehouse_id, current_qty, reorder_level,
              reorder_qty, qty_to_order, estimated_cost
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              reorderId, item.item_id, item.warehouse_id, item.current_qty,
              item.reorder_level, item.reorder_qty, item.qty_to_order,
              item.qty_to_order * 100 // Placeholder cost
            ]
          )
        }

        await connection.commit()
        return this.getById(reorderId)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to generate reorder request: ${error.message}`)
    }
  }

  // Create material request from reorder items
  static async createMaterialRequest(reorderId, userId) {
    try {
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        const reorder = await this.getById(reorderId)
        if (!reorder) throw new Error('Reorder request not found')

        // Generate MR number
        const date = new Date()
        const yearMonth = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0')
        
        const [mrResult] = await connection.query(
          `SELECT MAX(CAST(SUBSTRING(mr_no, -6) AS UNSIGNED)) as max_no 
          FROM material_requests 
          WHERE mr_no LIKE ?`,
          [`MR-${yearMonth}-%`]
        )

        const nextNo = (mrResult[0].max_no || 0) + 1
        const mrNo = `MR-${yearMonth}-${String(nextNo).padStart(6, '0')}`

        // Create material request
        const [mrInsert] = await connection.query(
          `INSERT INTO material_requests (
            mr_no, request_date, requested_by, department, status
          ) VALUES (?, NOW(), ?, 'stock', 'Draft')`,
          [mrNo, userId]
        )

        const mrId = mrInsert.insertId

        // Add items to MR
        for (const item of reorder.items) {
          await connection.query(
            `INSERT INTO material_request_items (
              material_request_id, item_id, qty_requested, warehouse_id
            ) VALUES (?, ?, ?, ?)`,
            [mrId, item.item_id, item.qty_to_order, item.warehouse_id]
          )
        }

        // Update reorder items with MR reference
        await connection.query(
          `UPDATE reorder_items SET mr_created = TRUE, mr_no = ? WHERE reorder_id = ?`,
          [mrNo, reorderId]
        )

        // Update reorder status
        await connection.query(
          `UPDATE reorder_management SET status = 'MR Created' WHERE id = ?`,
          [reorderId]
        )

        await connection.commit()
        return mrNo
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to create material request: ${error.message}`)
    }
  }

  // Mark reorder as received (PO received)
  static async markReceived(reorderId, poNo) {
    try {
      await db.query(
        `UPDATE reorder_management SET status = 'Received' WHERE id = ?`,
        [reorderId]
      )

      // Update all items in reorder
      await db.query(
        `UPDATE reorder_items SET po_created = TRUE, po_no = ? WHERE reorder_id = ?`,
        [poNo, reorderId]
      )

      return this.getById(reorderId)
    } catch (error) {
      throw new Error(`Failed to mark reorder as received: ${error.message}`)
    }
  }

  // Get low stock summary report
  static async getLowStockSummary(filters = {}) {
    try {
      let query = `
        SELECT 
          i.item_code,
          i.item_name,
          i.reorder_level,
          i.reorder_qty,
          w.warehouse_name,
          sb.current_qty,
          (i.reorder_level - sb.current_qty) as qty_shortage,
          sb.total_value as valuation,
          CASE 
            WHEN sb.current_qty = 0 THEN 'Critical'
            WHEN sb.current_qty < i.reorder_level * 0.5 THEN 'Urgent'
            ELSE 'Soon'
          END as priority
        FROM stock_balance sb
        JOIN items i ON sb.item_id = i.id
        JOIN warehouses w ON sb.warehouse_id = w.id
        WHERE sb.current_qty < i.reorder_level
        AND i.is_purchasable = TRUE
      `
      const params = []

      if (filters.warehouse) {
        query += ' AND w.warehouse_code = ?'
        params.push(filters.warehouse)
      }

      if (filters.priority) {
        if (filters.priority === 'Critical') {
          query += ' AND sb.current_qty = 0'
        } else if (filters.priority === 'Urgent') {
          query += ' AND sb.current_qty < (i.reorder_level * 0.5)'
        }
      }

      query += ' ORDER BY qty_shortage DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch low stock summary: ${error.message}`)
    }
  }

  // Get reorder statistics
  static async getReorderStatistics(filters = {}) {
    try {
      let query = `
        SELECT 
          rm.status,
          COUNT(rm.id) as request_count,
          COUNT(DISTINCT ri.item_id) as total_items,
          SUM(ri.qty_to_order) as total_qty,
          SUM(ri.estimated_cost) as total_estimated_cost
        FROM reorder_management rm
        LEFT JOIN reorder_items ri ON rm.id = ri.reorder_id
        WHERE 1=1
      `
      const params = []

      if (filters.startDate) {
        query += ' AND DATE(rm.request_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(rm.request_date) <= ?'
        params.push(filters.endDate)
      }

      query += ' GROUP BY rm.status'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch reorder statistics: ${error.message}`)
    }
  }
}

export default ReorderManagementModel

