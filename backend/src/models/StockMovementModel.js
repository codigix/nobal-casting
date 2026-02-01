import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'

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
          sw.warehouse_name as source_warehouse_name,
          tw.warehouse_name as target_warehouse_name,
          cu.full_name as created_by_user,
          au.full_name as approved_by_user
        FROM stock_movements sm
        LEFT JOIN item i ON sm.item_code = i.item_code
        LEFT JOIN warehouses w ON sm.warehouse_id = w.id
        LEFT JOIN warehouses sw ON sm.source_warehouse_id = sw.id
        LEFT JOIN warehouses tw ON sm.target_warehouse_id = tw.id
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
          sw.warehouse_name as source_warehouse_name,
          tw.warehouse_name as target_warehouse_name,
          cu.full_name as created_by_user,
          au.full_name as approved_by_user
        FROM stock_movements sm
        LEFT JOIN item i ON sm.item_code = i.item_code
        LEFT JOIN warehouses w ON sm.warehouse_id = w.id
        LEFT JOIN warehouses sw ON sm.source_warehouse_id = sw.id
        LEFT JOIN warehouses tw ON sm.target_warehouse_id = tw.id
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
        source_warehouse_id,
        target_warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_name,
        notes,
        created_by
      } = data

      const [result] = await db.query(
        `INSERT INTO stock_movements (
          transaction_no, item_code, warehouse_id, source_warehouse_id, target_warehouse_id, 
          movement_type, quantity, reference_type, reference_name, notes, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [transaction_no, item_code, warehouse_id, source_warehouse_id, target_warehouse_id, 
         movement_type, quantity, reference_type, reference_name, notes, created_by]
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

        // Get item details
        const [itemData] = await connection.query(
          `SELECT uom FROM item WHERE item_code = ?`,
          [movement.item_code]
        )
        const uom = itemData?.[0]?.uom || 'Kg'

        if (movement.movement_type === 'TRANSFER') {
          // Handle transfer: deduct from source, add to target
          const [sourceBalanceRows] = await connection.query(
            `SELECT current_qty FROM stock_balance WHERE item_code = ? AND warehouse_id = ?`,
            [movement.item_code, movement.source_warehouse_id]
          )
          const sourceQty = sourceBalanceRows[0]?.current_qty || 0

          if (sourceQty < movement.quantity) {
            throw new Error(`Insufficient stock in source warehouse. Available: ${sourceQty}, Requested: ${movement.quantity}`)
          }

          // Deduct from source warehouse
          await StockBalanceModel.upsert(movement.item_code, movement.source_warehouse_id, {
            current_qty: -movement.quantity,
            is_increment: true,
            last_issue_date: new Date()
          }, connection)

          // Create ledger entry for source (OUT) using standardized model
          await StockLedgerModel.create({
            item_code: movement.item_code,
            warehouse_id: movement.source_warehouse_id,
            transaction_date: new Date(),
            transaction_type: 'Transfer',
            qty_in: 0,
            qty_out: movement.quantity,
            reference_doctype: 'Stock Movement',
            reference_name: movement.transaction_no,
            remarks: `Transfer to warehouse: ${movement.target_warehouse_name}`,
            created_by: userId
          }, connection)

          // Add to target warehouse
          await StockBalanceModel.upsert(movement.item_code, movement.target_warehouse_id, {
            current_qty: movement.quantity,
            is_increment: true,
            last_receipt_date: new Date()
          }, connection)

          // Create ledger entry for target (IN) using standardized model
          await StockLedgerModel.create({
            item_code: movement.item_code,
            warehouse_id: movement.target_warehouse_id,
            transaction_date: new Date(),
            transaction_type: 'Transfer',
            qty_in: movement.quantity,
            qty_out: 0,
            reference_doctype: 'Stock Movement',
            reference_name: movement.transaction_no,
            remarks: `Transfer from warehouse: ${movement.source_warehouse_name}`,
            created_by: userId
          }, connection)
        } else {
          // Handle IN/OUT movements
          const qty_in = movement.movement_type === 'IN' ? movement.quantity : 0
          const qty_out = movement.movement_type === 'OUT' ? movement.quantity : 0

          // Create ledger entry using standardized model
          await StockLedgerModel.create({
            item_code: movement.item_code,
            warehouse_id: movement.warehouse_id,
            transaction_date: new Date(),
            transaction_type: movement.movement_type,
            qty_in: qty_in,
            qty_out: qty_out,
            reference_doctype: 'Stock Movement',
            reference_name: movement.transaction_no,
            remarks: movement.notes,
            created_by: userId
          }, connection)

          // Update stock balance
          await StockBalanceModel.upsert(movement.item_code, movement.warehouse_id, {
            current_qty: qty_in > 0 ? qty_in : -qty_out,
            is_increment: true,
            last_receipt_date: qty_in > 0 ? new Date() : null,
            last_issue_date: qty_out > 0 ? new Date() : null
          }, connection)
        }

        await connection.commit()

        const approvedMovement = await this.getById(id)
        
        try {
          await this.createNotifications(approvedMovement, userId)
        } catch (notifError) {
          console.log('Notification creation failed (non-critical):', notifError.message)
        }
        
        return approvedMovement
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

  static async createNotifications(movement, userId) {
    try {
      const NotificationModel = (await import('./NotificationModel.js')).default
      const db = this.getDb()

      let notificationType, title, message
      
      if (movement.movement_type === 'TRANSFER') {
        notificationType = 'TRANSFER_COMPLETE'
        title = `Stock Transfer Completed`
        message = `${movement.quantity} units of ${movement.item_code} transferred from ${movement.source_warehouse_name} to ${movement.target_warehouse_name}`
      } else if (movement.movement_type === 'IN') {
        notificationType = 'STOCK_IN'
        title = `Stock IN Approved`
        message = `${movement.quantity} units of ${movement.item_code} received in ${movement.warehouse_name}`
      } else {
        notificationType = 'STOCK_OUT'
        title = `Stock OUT Approved`
        message = `${movement.quantity} units of ${movement.item_code} issued from ${movement.warehouse_name}`
      }

      const [warehouseUsers] = await db.execute(
        `SELECT DISTINCT user_id FROM users WHERE department = 'Inventory' AND is_active = 1`
      )

      const userIds = warehouseUsers.map(u => u.user_id)
      
      if (userIds.length > 0) {
        await NotificationModel.notifyUsers(userIds, {
          notification_type: notificationType,
          title,
          message,
          reference_type: 'StockMovement',
          reference_id: movement.id
        })
      }

      const lowStockThreshold = 20
      const currentQty = movement.movement_type === 'TRANSFER' 
        ? (await db.execute(
            `SELECT current_qty FROM stock_balance WHERE item_code = ? AND warehouse_id = ?`,
            [movement.item_code, movement.target_warehouse_id || movement.warehouse_id]
          ))[0]?.[0]?.current_qty || 0
        : (await db.execute(
            `SELECT current_qty FROM stock_balance WHERE item_code = ? AND warehouse_id = ?`,
            [movement.item_code, movement.warehouse_id]
          ))[0]?.[0]?.current_qty || 0

      if (currentQty < lowStockThreshold) {
        const warehouseId = movement.movement_type === 'TRANSFER' ? movement.target_warehouse_id : movement.warehouse_id
        const [materialRequestUsers] = await db.execute(
          `SELECT DISTINCT user_id FROM users WHERE department IN ('Production', 'Purchase') AND is_active = 1`
        )
        
        const mrUserIds = materialRequestUsers.map(u => u.user_id)
        if (mrUserIds.length > 0) {
          await NotificationModel.notifyUsers(mrUserIds, {
            notification_type: 'LOW_STOCK',
            title: `Low Stock Alert: ${movement.item_code}`,
            message: `Stock level for ${movement.item_code} is now ${currentQty} units (below threshold of ${lowStockThreshold})`,
            reference_type: 'StockMovement',
            reference_id: movement.id
          })
        }
      }
    } catch (error) {
      throw new Error(`Failed to create notifications: ${error.message}`)
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
