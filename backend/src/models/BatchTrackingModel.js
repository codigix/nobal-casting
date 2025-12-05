class BatchTrackingModel {
  static getDb() {
    return global.db
  }

  // Get all batches
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT 
          bt.*,
          i.item_code,
          i.item_name,
          w.warehouse_code,
          w.warehouse_name
        FROM batch_tracking bt
        LEFT JOIN items i ON bt.item_id = i.id
        LEFT JOIN warehouses w ON bt.warehouse_id = w.id
        WHERE 1=1
      `
      const params = []

      if (filters.itemId) {
        query += ' AND bt.item_id = ?'
        params.push(filters.itemId)
      }

      if (filters.warehouseId) {
        query += ' AND bt.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      if (filters.status) {
        query += ' AND bt.status = ?'
        params.push(filters.status)
      }

      if (filters.search) {
        query += ' AND bt.batch_no LIKE ?'
        params.push(`%${filters.search}%`)
      }

      // Filter expired batches if requested
      if (filters.expiredOnly) {
        query += ' AND bt.expiry_date < CURDATE() AND bt.status = "Active"'
      }

      query += ' ORDER BY bt.batch_no DESC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch batches: ${error.message}`)
    }
  }

  // Get batch by ID
  static async getById(id) {
    try {
      const [rows] = await db.query(
        `SELECT 
          bt.*,
          i.item_code,
          i.item_name,
          w.warehouse_code,
          w.warehouse_name
        FROM batch_tracking bt
        LEFT JOIN items i ON bt.item_id = i.id
        LEFT JOIN warehouses w ON bt.warehouse_id = w.id
        WHERE bt.id = ?`,
        [id]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch batch: ${error.message}`)
    }
  }

  // Get batch by batch number
  static async getByBatchNo(batchNo) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM batch_tracking WHERE batch_no = ?',
        [batchNo]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch batch: ${error.message}`)
    }
  }

  // Create batch
  static async create(data) {
    try {
      const {
        batch_no,
        item_id,
        batch_qty,
        mfg_date,
        expiry_date,
        warehouse_id,
        reference_doctype,
        reference_name,
        remarks
      } = data

      // Check if batch already exists
      const existing = await this.getByBatchNo(batch_no)
      if (existing) {
        throw new Error('Batch number already exists')
      }

      const [result] = await db.query(
        `INSERT INTO batch_tracking (
          batch_no, item_id, batch_qty, mfg_date, expiry_date,
          warehouse_id, current_qty, status, reference_doctype, reference_name, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?)`,
        [batch_no, item_id, batch_qty, mfg_date, expiry_date, warehouse_id, batch_qty, reference_doctype, reference_name, remarks]
      )

      return this.getById(result.insertId)
    } catch (error) {
      throw new Error(`Failed to create batch: ${error.message}`)
    }
  }

  // Update batch quantity (when items are issued)
  static async updateQty(batchId, qtyUsed) {
    try {
      await db.query(
        `UPDATE batch_tracking 
        SET current_qty = current_qty - ? 
        WHERE id = ? AND current_qty >= ?`,
        [qtyUsed, batchId, qtyUsed]
      )

      // Check if batch is now empty
      const batch = await this.getById(batchId)
      if (batch && batch.current_qty === 0) {
        await db.query(
          'UPDATE batch_tracking SET status = "Used" WHERE id = ?',
          [batchId]
        )
      }

      return batch
    } catch (error) {
      throw new Error(`Failed to update batch quantity: ${error.message}`)
    }
  }

  // Mark batch as expired
  static async markExpired(batchId) {
    try {
      await db.query(
        'UPDATE batch_tracking SET status = "Expired" WHERE id = ?',
        [batchId]
      )
      return this.getById(batchId)
    } catch (error) {
      throw new Error(`Failed to mark batch as expired: ${error.message}`)
    }
  }

  // Mark batch as scrapped
  static async markScrapped(batchId, reason) {
    try {
      await db.query(
        `UPDATE batch_tracking 
        SET status = "Scrapped", remarks = ? 
        WHERE id = ?`,
        [reason, batchId]
      )
      return this.getById(batchId)
    } catch (error) {
      throw new Error(`Failed to mark batch as scrapped: ${error.message}`)
    }
  }

  // Get expired batches
  static async getExpiredBatches(filters = {}) {
    try {
      let query = `
        SELECT 
          bt.*,
          i.item_code,
          i.item_name,
          w.warehouse_name,
          DATEDIFF(CURDATE(), bt.expiry_date) as days_expired
        FROM batch_tracking bt
        LEFT JOIN items i ON bt.item_id = i.id
        LEFT JOIN warehouses w ON bt.warehouse_id = w.id
        WHERE bt.expiry_date < CURDATE() AND bt.status = 'Active'
      `
      const params = []

      if (filters.warehouseId) {
        query += ' AND bt.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      query += ' ORDER BY bt.expiry_date ASC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch expired batches: ${error.message}`)
    }
  }

  // Get near-expiry batches (within N days)
  static async getNearExpiryBatches(daysThreshold = 30, filters = {}) {
    try {
      let query = `
        SELECT 
          bt.*,
          i.item_code,
          i.item_name,
          w.warehouse_name,
          DATEDIFF(bt.expiry_date, CURDATE()) as days_remaining
        FROM batch_tracking bt
        LEFT JOIN items i ON bt.item_id = i.id
        LEFT JOIN warehouses w ON bt.warehouse_id = w.id
        WHERE bt.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND bt.status = 'Active'
      `
      const params = [daysThreshold]

      if (filters.warehouseId) {
        query += ' AND bt.warehouse_id = ?'
        params.push(filters.warehouseId)
      }

      query += ' ORDER BY bt.expiry_date ASC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch near-expiry batches: ${error.message}`)
    }
  }

  // Get batch traceability
  static async getBatchTraceability(batchNo) {
    try {
      const batch = await this.getByBatchNo(batchNo)
      if (!batch) return null

      // Get all transactions for this batch
      const [transactions] = await db.query(
        `SELECT 
          sl.*,
          w.warehouse_name
        FROM stock_ledger sl
        JOIN warehouses w ON sl.warehouse_id = w.id
        WHERE sl.reference_name LIKE ? OR sl.remarks LIKE ?
        ORDER BY sl.transaction_date DESC`,
        [`%${batchNo}%`, `%${batchNo}%`]
      )

      batch.transactions = transactions
      return batch
    } catch (error) {
      throw new Error(`Failed to fetch batch traceability: ${error.message}`)
    }
  }

  // Get batch stock summary by item
  static async getItemBatchSummary(itemId, warehouseId) {
    try {
      const [rows] = await db.query(
        `SELECT 
          batch_no,
          mfg_date,
          expiry_date,
          batch_qty,
          current_qty,
          status,
          CASE 
            WHEN expiry_date < CURDATE() THEN 'Expired'
            WHEN expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Near Expiry'
            ELSE 'Good'
          END as condition
        FROM batch_tracking
        WHERE item_id = ? AND warehouse_id = ?
        ORDER BY batch_no ASC`,
        [itemId, warehouseId]
      )
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch batch summary: ${error.message}`)
    }
  }
}

export default BatchTrackingModel

