export class RFQModel {
  /**
   * Get all RFQs
   */
  static async getAll(db, filters = {}) {
    try {
      let query = 'SELECT r.*, c.name as created_by_name, COUNT(DISTINCT rs.supplier_id) as supplier_count FROM rfq r LEFT JOIN contact c ON r.created_by_id = c.contact_id LEFT JOIN rfq_supplier rs ON r.rfq_id = rs.rfq_id WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND r.status = ?'
        params.push(filters.status)
      }

      if (filters.search) {
        query += ' AND r.rfq_id LIKE ?'
        params.push(`%${filters.search}%`)
      }

      query += ' GROUP BY r.rfq_id ORDER BY r.created_date DESC LIMIT 100'

      const [rows] = await db.execute(query, params)
      return rows
    } catch (error) {
      throw new Error('Failed to fetch RFQs: ' + error.message)
    }
  }

  /**
   * Get RFQ by ID with details
   */
  static async getById(db, rfqId) {
    try {
      const [rfqRows] = await db.execute(
        'SELECT r.*, c.name as created_by_name FROM rfq r LEFT JOIN contact c ON r.created_by_id = c.contact_id WHERE r.rfq_id = ?',
        [rfqId]
      )

      if (!rfqRows.length) return null

      const rfq = rfqRows[0]

      // Get items
      const [itemRows] = await db.execute(
        'SELECT ri.*, i.name as item_name FROM rfq_item ri LEFT JOIN item i ON ri.item_code = i.item_code WHERE ri.rfq_id = ?',
        [rfqId]
      )

      // Get suppliers
      const [supplierRows] = await db.execute(
        'SELECT rs.*, s.name as supplier_name, s.contact_person_id FROM rfq_supplier rs LEFT JOIN supplier s ON rs.supplier_id = s.supplier_id WHERE rs.rfq_id = ?',
        [rfqId]
      )

      return {
        ...rfq,
        items: itemRows,
        suppliers: supplierRows
      }
    } catch (error) {
      throw new Error('Failed to fetch RFQ: ' + error.message)
    }
  }

  /**
   * Create new RFQ
   */
  static async create(db, rfqData) {
    try {
      const {
        series_no,
        created_by_id,
        valid_till,
        items = [],
        suppliers = []
      } = rfqData

      const rfq_id = 'RFQ-' + Date.now()
      const created_date = new Date().toISOString().split('T')[0]

      // Insert RFQ
      await db.execute(
        'INSERT INTO rfq (rfq_id, created_by_id, created_date, valid_till, status) VALUES (?, ?, ?, ?, ?)',
        [rfq_id, created_by_id || null, created_date, valid_till, 'draft']
      )

      // Insert items
      if (items.length > 0) {
        for (const item of items) {
          await db.execute(
            'INSERT INTO rfq_item (rfq_id, item_code, qty, uom) VALUES (?, ?, ?, ?)',
            [rfq_id, item.item_code, item.qty, item.uom]
          )
        }
      }

      // Insert suppliers
      if (suppliers.length > 0) {
        for (const supplier of suppliers) {
          await db.execute(
            'INSERT INTO rfq_supplier (rfq_id, supplier_id) VALUES (?, ?)',
            [rfq_id, supplier.supplier_id]
          )
        }
      }

      return await this.getById(db, rfq_id)
    } catch (error) {
      throw new Error('Failed to create RFQ: ' + error.message)
    }
  }

  /**
   * Update RFQ
   */
  static async update(db, rfqId, rfqData) {
    try {
      const { valid_till, items = [], suppliers = [] } = rfqData

      // Check if RFQ is draft
      const [existingRFQ] = await db.execute(
        'SELECT status FROM rfq WHERE rfq_id = ?',
        [rfqId]
      )

      if (!existingRFQ.length) throw new Error('RFQ not found')
      if (existingRFQ[0].status !== 'draft') {
        throw new Error('Cannot update RFQ with status: ' + existingRFQ[0].status)
      }

      // Update RFQ
      await db.execute(
        'UPDATE rfq SET valid_till = ? WHERE rfq_id = ?',
        [valid_till, rfqId]
      )

      // Update items if provided
      if (items.length > 0) {
        await db.execute('DELETE FROM rfq_item WHERE rfq_id = ?', [rfqId])
        for (const item of items) {
          await db.execute(
            'INSERT INTO rfq_item (rfq_id, item_code, qty, uom) VALUES (?, ?, ?, ?)',
            [rfqId, item.item_code, item.qty, item.uom]
          )
        }
      }

      // Update suppliers if provided
      if (suppliers.length > 0) {
        await db.execute('DELETE FROM rfq_supplier WHERE rfq_id = ?', [rfqId])
        for (const supplier of suppliers) {
          await db.execute(
            'INSERT INTO rfq_supplier (rfq_id, supplier_id) VALUES (?, ?)',
            [rfqId, supplier.supplier_id]
          )
        }
      }

      return await this.getById(db, rfqId)
    } catch (error) {
      throw new Error('Failed to update RFQ: ' + error.message)
    }
  }

  /**
   * Send RFQ to suppliers
   */
  static async send(db, rfqId) {
    try {
      const [rfq] = await db.execute('SELECT status FROM rfq WHERE rfq_id = ?', [rfqId])
      if (!rfq.length) throw new Error('RFQ not found')
      if (rfq[0].status !== 'draft') throw new Error('Only draft RFQs can be sent')

      // Update RFQ status
      await db.execute(
        'UPDATE rfq SET status = ?, updated_at = NOW() WHERE rfq_id = ?',
        ['sent', rfqId]
      )

      return await this.getById(db, rfqId)
    } catch (error) {
      throw new Error('Failed to send RFQ: ' + error.message)
    }
  }

  /**
   * Mark RFQ as receiving responses
   */
  static async receiveResponses(db, rfqId) {
    try {
      await db.execute(
        'UPDATE rfq SET status = ? WHERE rfq_id = ?',
        ['responses_received', rfqId]
      )
      return await this.getById(db, rfqId)
    } catch (error) {
      throw new Error('Failed to update RFQ status: ' + error.message)
    }
  }

  /**
   * Close RFQ
   */
  static async close(db, rfqId) {
    try {
      await db.execute(
        'UPDATE rfq SET status = ? WHERE rfq_id = ?',
        ['closed', rfqId]
      )
      return await this.getById(db, rfqId)
    } catch (error) {
      throw new Error('Failed to close RFQ: ' + error.message)
    }
  }

  /**
   * Delete RFQ
   */
  static async delete(db, rfqId) {
    try {
      const [rfq] = await db.execute('SELECT status FROM rfq WHERE rfq_id = ?', [rfqId])
      if (!rfq.length) throw new Error('RFQ not found')
      if (rfq[0].status !== 'draft') throw new Error('Can only delete draft RFQs')

      await db.execute('DELETE FROM rfq_item WHERE rfq_id = ?', [rfqId])
      await db.execute('DELETE FROM rfq_supplier WHERE rfq_id = ?', [rfqId])
      await db.execute('DELETE FROM rfq WHERE rfq_id = ?', [rfqId])

      return true
    } catch (error) {
      throw new Error('Failed to delete RFQ: ' + error.message)
    }
  }

  /**
   * Get RFQ responses
   */
  static async getResponses(db, rfqId) {
    try {
      const [rows] = await db.execute(
        `SELECT sq.*, s.name as supplier_name FROM supplier_quotation sq 
         LEFT JOIN supplier s ON sq.supplier_id = s.supplier_id 
         WHERE sq.rfq_id = ? ORDER BY sq.quote_date DESC`,
        [rfqId]
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch RFQ responses: ' + error.message)
    }
  }

  /**
   * Get pending RFQs (for sending)
   */
  static async getPending(db) {
    try {
      const [rows] = await db.execute(
        'SELECT r.*, COUNT(DISTINCT rs.supplier_id) as supplier_count FROM rfq r LEFT JOIN rfq_supplier rs ON r.rfq_id = rs.rfq_id WHERE r.status = "draft" GROUP BY r.rfq_id ORDER BY r.created_date DESC'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch pending RFQs: ' + error.message)
    }
  }

  /**
   * Get open RFQs (sent but not closed)
   */
  static async getOpen(db) {
    try {
      const [rows] = await db.execute(
        'SELECT r.*, COUNT(DISTINCT rs.supplier_id) as supplier_count FROM rfq r LEFT JOIN rfq_supplier rs ON r.rfq_id = rs.rfq_id WHERE r.status IN ("sent", "responses_received") GROUP BY r.rfq_id ORDER BY r.valid_till ASC'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch open RFQs: ' + error.message)
    }
  }
}