class MaterialTransferModel {
  static getDb() {
    return global.db
  }

  // Get all material transfers
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          mt.*,
          fw.warehouse_code as from_warehouse_code,
          fw.warehouse_name as from_warehouse_name,
          tw.warehouse_code as to_warehouse_code,
          tw.warehouse_name as to_warehouse_name,
          cu.full_name as created_by_user,
          ru.full_name as received_by_user
        FROM material_transfers mt
        JOIN warehouses fw ON mt.from_warehouse_id = fw.id
        JOIN warehouses tw ON mt.to_warehouse_id = tw.id
        LEFT JOIN users cu ON mt.created_by = cu.user_id
        LEFT JOIN users ru ON mt.received_by = ru.user_id
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND mt.status = ?'
        params.push(filters.status)
      }

      if (filters.fromWarehouseId) {
        query += ' AND mt.from_warehouse_id = ?'
        params.push(filters.fromWarehouseId)
      }

      if (filters.toWarehouseId) {
        query += ' AND mt.to_warehouse_id = ?'
        params.push(filters.toWarehouseId)
      }

      if (filters.startDate) {
        query += ' AND DATE(mt.transfer_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(mt.transfer_date) <= ?'
        params.push(filters.endDate)
      }

      if (filters.search) {
        query += ' AND mt.transfer_no LIKE ?'
        params.push(`%${filters.search}%`)
      }

      query += ' ORDER BY mt.transfer_date DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch material transfers: ${error.message}`)
    }
  }

  // Get material transfer by ID
  static async getById(id) {
    try {
      const db = this.getDb()
      const [transferRows] = await db.query(
        `SELECT 
          mt.*,
          fw.warehouse_code as from_warehouse_code,
          fw.warehouse_name as from_warehouse_name,
          tw.warehouse_code as to_warehouse_code,
          tw.warehouse_name as to_warehouse_name
        FROM material_transfers mt
        JOIN warehouses fw ON mt.from_warehouse_id = fw.id
        JOIN warehouses tw ON mt.to_warehouse_id = tw.id
        WHERE mt.id = ?`,
        [id]
      )

      if (!transferRows[0]) return null

      const transfer = transferRows[0]

      // Get items
      const [items] = await db.query(
        `SELECT 
          mti.*,
          i.item_code,
          i.name as item_name,
          i.uom
        FROM material_transfer_items mti
        JOIN item i ON mti.item_id = i.item_code
        WHERE mti.material_transfer_id = ?`,
        [id]
      )

      transfer.items = items
      return transfer
    } catch (error) {
      throw new Error(`Failed to fetch material transfer: ${error.message}`)
    }
  }

  // Get by transfer number
  static async getByTransferNo(transferNo) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        'SELECT * FROM material_transfers WHERE transfer_no = ?',
        [transferNo]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch material transfer: ${error.message}`)
    }
  }

  // Create material transfer
  static async create(data) {
    try {
      const db = this.getDb()
      const {
        transfer_no,
        transfer_date,
        from_warehouse_id,
        to_warehouse_id,
        transfer_remarks,
        created_by,
        items = []
      } = data

      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Create transfer
        const [result] = await connection.query(
          `INSERT INTO material_transfers (
            transfer_no, transfer_date, from_warehouse_id, to_warehouse_id,
            status, transfer_remarks, created_by
          ) VALUES (?, ?, ?, ?, 'Draft', ?, ?)`,
          [transfer_no, transfer_date, from_warehouse_id, to_warehouse_id, transfer_remarks, created_by]
        )

        const transferId = result.insertId
        let totalQty = 0

        // Add items
        for (const item of items) {
          totalQty += item.qty

          await connection.query(
            `INSERT INTO material_transfer_items (
              material_transfer_id, item_id, qty, uom, batch_no, serial_no
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [transferId, item.item_id, item.qty, item.uom || 'Kg', item.batch_no, item.serial_no]
          )
        }

        // Update total
        await connection.query(
          'UPDATE material_transfers SET total_qty = ? WHERE id = ?',
          [totalQty, transferId]
        )

        await connection.commit()
        return this.getById(transferId)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to create material transfer: ${error.message}`)
    }
  }

  // Send transfer for receipt (change to In Transit)
  static async sendTransfer(id, userId) {
    try {
      const db = this.getDb()
      await db.query(
        `UPDATE material_transfers SET status = 'In Transit' WHERE id = ? AND status = 'Draft'`,
        [id]
      )
      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to send material transfer: ${error.message}`)
    }
  }

  // Receive transfer (update stock at destination)
  static async receiveTransfer(id, userId) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Update transfer status
        await connection.query(
          `UPDATE material_transfers SET status = 'Received', received_by = ? WHERE id = ?`,
          [userId, id]
        )

        // Get transfer details
        const transfer = await this.getById(id)

        // Create stock ledger entries
        for (const item of transfer.items) {
          // Deduct from source warehouse
          await connection.query(
            `INSERT INTO stock_ledger (
              item_id, warehouse_id, transaction_date, transaction_type,
              qty_in, qty_out, valuation_rate, reference_doctype, reference_name, created_by
            ) VALUES (?, ?, ?, 'Transfer', ?, ?, ?, 'Material Transfer', ?, ?)`,
            [item.item_id, transfer.from_warehouse_id, transfer.transfer_date, 0, item.qty, 0, 0, transfer.transfer_no, userId]
          )

          // Add to destination warehouse
          await connection.query(
            `INSERT INTO stock_ledger (
              item_id, warehouse_id, transaction_date, transaction_type,
              qty_in, qty_out, valuation_rate, reference_doctype, reference_name, created_by
            ) VALUES (?, ?, ?, 'Transfer', ?, ?, ?, 'Material Transfer', ?, ?)`,
            [item.item_id, transfer.to_warehouse_id, transfer.transfer_date, item.qty, 0, 0, transfer.transfer_no, userId]
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
      throw new Error(`Failed to receive material transfer: ${error.message}`)
    }
  }

  // Get transfer register (all transfers with status)
  static async getTransferRegister(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          mt.transfer_no,
          mt.transfer_date,
          fw.warehouse_name as from_warehouse,
          tw.warehouse_name as to_warehouse,
          COUNT(mti.id) as item_count,
          SUM(mti.qty) as total_qty,
          mt.status
        FROM material_transfers mt
        JOIN warehouses fw ON mt.from_warehouse_id = fw.id
        JOIN warehouses tw ON mt.to_warehouse_id = tw.id
        LEFT JOIN material_transfer_items mti ON mt.id = mti.material_transfer_id
        WHERE 1=1
      `
      const params = []

      if (filters.startDate) {
        query += ' AND DATE(mt.transfer_date) >= ?'
        params.push(filters.startDate)
      }

      if (filters.endDate) {
        query += ' AND DATE(mt.transfer_date) <= ?'
        params.push(filters.endDate)
      }

      query += ' GROUP BY mt.id ORDER BY mt.transfer_date DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch transfer register: ${error.message}`)
    }
  }

  // Generate next transfer number
  static async generateTransferNo() {
    try {
      const db = this.getDb()
      const date = new Date()
      const yearMonth = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0')
      
      const [result] = await db.query(
        `SELECT MAX(CAST(SUBSTRING(transfer_no, -6) AS UNSIGNED)) as max_no 
        FROM material_transfers 
        WHERE transfer_no LIKE ?`,
        [`MT-${yearMonth}-%`]
      )

      const nextNo = (result[0].max_no || 0) + 1
      return `MT-${yearMonth}-${String(nextNo).padStart(6, '0')}`
    } catch (error) {
      throw new Error(`Failed to generate transfer number: ${error.message}`)
    }
  }
}

export default MaterialTransferModel

