export class SupplierQuotationModel {
  /**
   * Get all supplier quotations
   */
  static async getAll(db, filters = {}) {
    try {
      let query = 'SELECT sq.*, s.name as supplier_name FROM supplier_quotation sq LEFT JOIN supplier s ON sq.supplier_id = s.supplier_id WHERE 1=1'
      const params = []

      if (filters.status) {
        query += ' AND sq.status = ?'
        params.push(filters.status)
      }

      if (filters.supplier_id) {
        query += ' AND sq.supplier_id = ?'
        params.push(filters.supplier_id)
      }

      if (filters.rfq_id) {
        query += ' AND sq.rfq_id = ?'
        params.push(filters.rfq_id)
      }

      if (filters.search) {
        query += ' AND (sq.supplier_quotation_id LIKE ? OR s.name LIKE ?)'
        const term = `%${filters.search}%`
        params.push(term, term)
      }

      query += ' ORDER BY sq.quote_date DESC LIMIT 100'

      const [rows] = await db.execute(query, params)
      return rows
    } catch (error) {
      throw new Error('Failed to fetch quotations: ' + error.message)
    }
  }

  /**
   * Get quotation by ID with items
   */
  static async getById(db, quotationId) {
    try {
      const [sqRows] = await db.execute(
        'SELECT sq.*, s.name as supplier_name FROM supplier_quotation sq LEFT JOIN supplier s ON sq.supplier_id = s.supplier_id WHERE sq.supplier_quotation_id = ?',
        [quotationId]
      )

      if (!sqRows.length) return null

      const sq = sqRows[0]

      // Get items
      const [itemRows] = await db.execute(
        'SELECT sqi.*, i.name as item_name FROM supplier_quotation_item sqi LEFT JOIN item i ON sqi.item_code = i.item_code WHERE sqi.supplier_quotation_id = ?',
        [quotationId]
      )

      return {
        ...sq,
        items: itemRows
      }
    } catch (error) {
      throw new Error('Failed to fetch quotation: ' + error.message)
    }
  }

  /**
   * Create new supplier quotation
   */
  static async create(db, quotationData) {
    try {
      const {
        supplier_id,
        rfq_id,
        items = [],
        total_value = 0,
        created_by = 'system'
      } = quotationData

      const supplier_quotation_id = 'SQ-' + Date.now()
      const quote_date = new Date().toISOString().split('T')[0]

      // Insert quotation
      await db.execute(
        'INSERT INTO supplier_quotation (supplier_quotation_id, supplier_id, rfq_id, quote_date, total_value, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [supplier_quotation_id, supplier_id, rfq_id, quote_date, total_value, 'draft', created_by]
      )

      // Insert items
      if (items.length > 0) {
        for (const item of items) {
          const sq_item_id = 'SQI-' + Date.now() + '-' + Math.random()
          await db.execute(
            'INSERT INTO supplier_quotation_item (sq_item_id, supplier_quotation_id, item_code, rate, lead_time_days, min_qty) VALUES (?, ?, ?, ?, ?, ?)',
            [sq_item_id, supplier_quotation_id, item.item_code, item.rate, item.lead_time_days, item.min_qty]
          )
        }
      }

      return await this.getById(db, supplier_quotation_id)
    } catch (error) {
      throw new Error('Failed to create quotation: ' + error.message)
    }
  }

  /**
   * Update supplier quotation
   */
  static async update(db, quotationId, quotationData) {
    try {
      const { items = [], total_value } = quotationData

      // Check if draft
      const [existing] = await db.execute(
        'SELECT status FROM supplier_quotation WHERE supplier_quotation_id = ?',
        [quotationId]
      )

      if (!existing.length) throw new Error('Quotation not found')
      if (existing[0].status !== 'draft') {
        throw new Error('Cannot update quotation with status: ' + existing[0].status)
      }

      // Update quotation
      if (total_value !== undefined) {
        await db.execute(
          'UPDATE supplier_quotation SET total_value = ? WHERE supplier_quotation_id = ?',
          [total_value, quotationId]
        )
      }

      // Update items if provided
      if (items.length > 0) {
        await db.execute('DELETE FROM supplier_quotation_item WHERE supplier_quotation_id = ?', [quotationId])
        for (const item of items) {
          const sq_item_id = 'SQI-' + Date.now() + '-' + Math.random()
          await db.execute(
            'INSERT INTO supplier_quotation_item (sq_item_id, supplier_quotation_id, item_code, rate, lead_time_days, min_qty) VALUES (?, ?, ?, ?, ?, ?)',
            [sq_item_id, quotationId, item.item_code, item.rate, item.lead_time_days, item.min_qty]
          )
        }
      }

      return await this.getById(db, quotationId)
    } catch (error) {
      throw new Error('Failed to update quotation: ' + error.message)
    }
  }

  /**
   * Submit quotation (change to received)
   */
  static async submit(db, quotationId) {
    try {
      await db.execute(
        'UPDATE supplier_quotation SET status = ? WHERE supplier_quotation_id = ?',
        ['received', quotationId]
      )
      return await this.getById(db, quotationId)
    } catch (error) {
      throw new Error('Failed to submit quotation: ' + error.message)
    }
  }

  /**
   * Accept quotation
   */
  static async accept(db, quotationId) {
    try {
      const [sq] = await db.execute(
        'SELECT status FROM supplier_quotation WHERE supplier_quotation_id = ?',
        [quotationId]
      )

      if (!sq.length) throw new Error('Quotation not found')
      if (sq[0].status !== 'received') {
        throw new Error('Only received quotations can be accepted')
      }

      await db.execute(
        'UPDATE supplier_quotation SET status = ? WHERE supplier_quotation_id = ?',
        ['accepted', quotationId]
      )

      return await this.getById(db, quotationId)
    } catch (error) {
      throw new Error('Failed to accept quotation: ' + error.message)
    }
  }

  /**
   * Reject quotation
   */
  static async reject(db, quotationId, reason) {
    try {
      const [sq] = await db.execute(
        'SELECT status FROM supplier_quotation WHERE supplier_quotation_id = ?',
        [quotationId]
      )

      if (!sq.length) throw new Error('Quotation not found')

      await db.execute(
        'UPDATE supplier_quotation SET status = ? WHERE supplier_quotation_id = ?',
        ['rejected', quotationId]
      )

      return await this.getById(db, quotationId)
    } catch (error) {
      throw new Error('Failed to reject quotation: ' + error.message)
    }
  }

  /**
   * Delete quotation
   */
  static async delete(db, quotationId) {
    try {
      const [sq] = await db.execute(
        'SELECT status FROM supplier_quotation WHERE supplier_quotation_id = ?',
        [quotationId]
      )

      if (!sq.length) throw new Error('Quotation not found')
      if (sq[0].status !== 'draft') throw new Error('Can only delete draft quotations')

      await db.execute(
        'DELETE FROM supplier_quotation_item WHERE supplier_quotation_id = ?',
        [quotationId]
      )
      await db.execute(
        'DELETE FROM supplier_quotation WHERE supplier_quotation_id = ?',
        [quotationId]
      )

      return true
    } catch (error) {
      throw new Error('Failed to delete quotation: ' + error.message)
    }
  }

  /**
   * Get quotations for RFQ
   */
  static async getByRFQ(db, rfqId) {
    try {
      const [rows] = await db.execute(
        'SELECT sq.*, s.name as supplier_name FROM supplier_quotation sq LEFT JOIN supplier s ON sq.supplier_id = s.supplier_id WHERE sq.rfq_id = ? ORDER BY sq.total_value ASC',
        [rfqId]
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch quotations for RFQ: ' + error.message)
    }
  }

  /**
   * Get quotations by supplier
   */
  static async getBySupplier(db, supplierId) {
    try {
      const [rows] = await db.execute(
        'SELECT sq.*, s.name as supplier_name FROM supplier_quotation sq LEFT JOIN supplier s ON sq.supplier_id = s.supplier_id WHERE sq.supplier_id = ? ORDER BY sq.quote_date DESC',
        [supplierId]
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch quotations for supplier: ' + error.message)
    }
  }

  /**
   * Compare quotations (for same RFQ)
   */
  static async compareForRFQ(db, rfqId) {
    try {
      const [rows] = await db.execute(
        `SELECT sq.*, s.name as supplier_name, s.rating 
         FROM supplier_quotation sq 
         LEFT JOIN supplier s ON sq.supplier_id = s.supplier_id 
         WHERE sq.rfq_id = ? AND sq.status = 'received'
         ORDER BY sq.total_value ASC`,
        [rfqId]
      )

      // Get items for each quotation
      const quotations = []
      for (const q of rows) {
        const [items] = await db.execute(
          'SELECT sqi.*, i.name as item_name FROM supplier_quotation_item sqi LEFT JOIN item i ON sqi.item_code = i.item_code WHERE sqi.supplier_quotation_id = ?',
          [q.supplier_quotation_id]
        )
        quotations.push({
          ...q,
          items
        })
      }

      return quotations
    } catch (error) {
      throw new Error('Failed to compare quotations: ' + error.message)
    }
  }

  /**
   * Get pending quotations (draft)
   */
  static async getPending(db) {
    try {
      const [rows] = await db.execute(
        'SELECT sq.*, s.name as supplier_name FROM supplier_quotation sq LEFT JOIN supplier s ON sq.supplier_id = s.supplier_id WHERE sq.status = "draft" ORDER BY sq.created_at DESC'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch pending quotations: ' + error.message)
    }
  }
}