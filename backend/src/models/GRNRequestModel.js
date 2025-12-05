class GRNRequestModel {
  static getDb() {
    return global.db
  }

  static async create(data) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        const {
          grn_no,
          po_no,
          supplier_id,
          supplier_name,
          receipt_date,
          created_by,
          items = [],
          notes = ''
        } = data

        const [result] = await connection.query(
          `INSERT INTO grn_requests (
            grn_no, po_no, supplier_id, supplier_name, receipt_date, 
            created_by, status, total_items, notes
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
          [grn_no, po_no, supplier_id, supplier_name, receipt_date, created_by, items.length, notes]
        )

        const grnRequestId = result.insertId

        for (const item of items) {
          await connection.query(
            `INSERT INTO grn_request_items (
              grn_request_id, item_code, item_name, po_qty, received_qty, 
              batch_no, warehouse_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              grnRequestId,
              item.item_code,
              item.item_name,
              item.po_qty,
              item.received_qty,
              item.batch_no,
              item.warehouse_name
            ]
          )
        }

        if (po_no) {
          await connection.query(
            `UPDATE purchase_order SET status = 'to_receive' WHERE po_no = ? AND status = 'submitted'`,
            [po_no]
          )
        }

        await connection.commit()
        return this.getById(grnRequestId)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to create GRN request: ${error.message}`)
    }
  }

  static async getById(id) {
    try {
      const db = this.getDb()
      const isNumeric = /^\d+$/.test(id)
      const query = isNumeric 
        ? 'gr.id = ?' 
        : 'gr.grn_no = ?'
      
      const [rows] = await db.query(
        `SELECT gr.*, u.full_name as created_by_user, u2.full_name as assigned_user, u3.full_name as approved_by_user
         FROM grn_requests gr
         LEFT JOIN users u ON gr.created_by = u.user_id
         LEFT JOIN users u2 ON gr.assigned_to = u2.user_id
         LEFT JOIN users u3 ON gr.approved_by = u3.user_id
         WHERE ${query}`,
        [id]
      )

      if (!rows[0]) return null

      const grn = rows[0]

      const [items] = await db.query(
        'SELECT * FROM grn_request_items WHERE grn_request_id = ?',
        [grn.id]
      )

      grn.items = items

      const [logs] = await db.query(
        `SELECT * FROM grn_request_logs WHERE grn_request_id = ? ORDER BY created_at DESC`,
        [grn.id]
      )

      grn.logs = logs

      return grn
    } catch (error) {
      throw new Error(`Failed to fetch GRN request: ${error.message}`)
    }
  }

  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT gr.*, u.full_name as created_by_user, u2.full_name as assigned_user, COUNT(gri.id) as total_items
        FROM grn_requests gr
        LEFT JOIN users u ON gr.created_by = u.user_id
        LEFT JOIN users u2 ON gr.assigned_to = u2.user_id
        LEFT JOIN grn_request_items gri ON gr.id = gri.grn_request_id
        WHERE 1=1
      `
      const params = []

      if (filters.status) {
        query += ' AND gr.status = ?'
        params.push(filters.status)
      }

      if (filters.assigned_to) {
        query += ' AND gr.assigned_to = ?'
        params.push(filters.assigned_to)
      }

      if (filters.search) {
        query += ' AND (gr.grn_no LIKE ? OR gr.po_no LIKE ? OR gr.supplier_name LIKE ?)'
        const searchTerm = `%${filters.search}%`
        params.push(searchTerm, searchTerm, searchTerm)
      }

      if (filters.created_by) {
        query += ' AND gr.created_by = ?'
        params.push(filters.created_by)
      }

      query += ' GROUP BY gr.id ORDER BY gr.created_at DESC'

      const [rows] = await db.query(query, params)
      
      const grnsWithItems = await Promise.all(
        rows.map(async (grn) => {
          const [items] = await db.query(
            'SELECT * FROM grn_request_items WHERE grn_request_id = ?',
            [grn.id]
          )
          return { ...grn, items }
        })
      )

      return grnsWithItems
    } catch (error) {
      throw new Error(`Failed to fetch GRN requests: ${error.message}`)
    }
  }

  static async approve(id, userId, approvedItems = []) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        const totalAccepted = approvedItems.reduce((sum, item) => sum + (item.accepted_qty || 0), 0)
        const totalRejected = approvedItems.reduce((sum, item) => sum + (item.rejected_qty || 0), 0)

        await connection.query(
          `UPDATE grn_requests SET 
           status = 'approved', 
           approval_date = NOW(), 
           approved_by = ?,
           total_accepted = ?,
           total_rejected = ?
           WHERE id = ?`,
          [userId, totalAccepted, totalRejected, id]
        )

        for (const item of approvedItems) {
          await connection.query(
            `UPDATE grn_request_items SET 
             accepted_qty = ?, 
             rejected_qty = ?,
             item_status = ?
             WHERE id = ?`,
            [
              item.accepted_qty || 0,
              item.rejected_qty || 0,
              item.rejected_qty ? 'partially_accepted' : 'accepted',
              item.id
            ]
          )
        }

        await connection.query(
          `INSERT INTO grn_request_logs (grn_request_id, action, status_from, status_to, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [id, 'APPROVED', 'pending', 'approved', userId]
        )

        await connection.commit()
        return this.getById(id)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to approve GRN request: ${error.message}`)
    }
  }

  static async reject(id, userId, rejectionReason) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        await connection.query(
          `UPDATE grn_requests SET 
           status = 'rejected', 
           rejection_date = NOW(), 
           rejection_reason = ?,
           approved_by = ?
           WHERE id = ?`,
          [rejectionReason, userId, id]
        )

        await connection.query(
          `INSERT INTO grn_request_logs (grn_request_id, action, status_from, status_to, reason, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, 'REJECTED', 'pending', 'rejected', rejectionReason, userId]
        )

        await connection.commit()
        return this.getById(id)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to reject GRN request: ${error.message}`)
    }
  }

  static async sendBack(id, userId, reason) {
    try {
      const db = this.getDb()
      await db.query(
        `UPDATE grn_requests SET status = 'sent_back', approved_by = ? WHERE id = ?`,
        [userId, id]
      )

      await db.query(
        `INSERT INTO grn_request_logs (grn_request_id, action, status_from, status_to, reason, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, 'SENT_BACK', 'inspecting', 'sent_back', reason, userId]
      )

      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to send back GRN request: ${error.message}`)
    }
  }

  static async markInspecting(id, userId) {
    try {
      const db = this.getDb()
      await db.query(
        `UPDATE grn_requests SET status = 'inspecting', assigned_to = ? WHERE id = ?`,
        [userId, id]
      )

      await db.query(
        `INSERT INTO grn_request_logs (grn_request_id, action, status_from, status_to, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [id, 'START_INSPECTION', 'pending', 'inspecting', userId]
      )

      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to mark GRN as inspecting: ${error.message}`)
    }
  }

  static async updateItemStatus(itemId, status, notes = '') {
    try {
      const db = this.getDb()
      await db.query(
        `UPDATE grn_request_items SET item_status = ?, notes = ? WHERE id = ?`,
        [status, notes, itemId]
      )
      return true
    } catch (error) {
      throw new Error(`Failed to update item status: ${error.message}`)
    }
  }

  static async inspectItem(itemId, inspectionData) {
    try {
      const db = this.getDb()
      const { status, notes, accepted_qty, rejected_qty, qc_checks } = inspectionData

      const qcChecksJson = JSON.stringify(qc_checks || {})

      await db.query(
        `UPDATE grn_request_items SET 
         item_status = ?, 
         notes = ?, 
         accepted_qty = ?,
         rejected_qty = ?,
         qc_checks = ?,
         inspected_at = NOW()
         WHERE id = ?`,
        [status, notes, accepted_qty, rejected_qty, qcChecksJson, itemId]
      )
      return true
    } catch (error) {
      throw new Error(`Failed to inspect item: ${error.message}`)
    }
  }

  static async sendToInventory(id, userId, approvedItems = []) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        const totalAccepted = approvedItems.reduce((sum, item) => sum + (item.accepted_qty || 0), 0)
        const totalRejected = approvedItems.reduce((sum, item) => sum + (item.rejected_qty || 0), 0)

        await connection.query(
          `UPDATE grn_requests SET 
           status = 'awaiting_inventory_approval', 
           inspection_completed_by = ?,
           total_accepted = ?,
           total_rejected = ?
           WHERE id = ?`,
          [userId, totalAccepted, totalRejected, id]
        )

        for (const item of approvedItems) {
          await connection.query(
            `UPDATE grn_request_items SET 
             accepted_qty = ?, 
             rejected_qty = ?,
             item_status = ?,
             warehouse_name = ?
             WHERE id = ?`,
            [
              item.accepted_qty || 0,
              item.rejected_qty || 0,
              item.rejected_qty ? 'partially_accepted' : 'accepted',
              item.warehouse || item.warehouse_name || 'Main Warehouse',
              item.id
            ]
          )
        }

        await connection.query(
          `INSERT INTO grn_request_logs (grn_request_id, action, status_from, status_to, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [id, 'INSPECTION_COMPLETE', 'inspecting', 'awaiting_inventory_approval', userId]
        )

        await connection.commit()
        return this.getById(id)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to send GRN to inventory: ${error.message}`)
    }
  }

  static async inventoryApprove(id, userId) {
    try {
      const db = this.getDb()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        await connection.query(
          `UPDATE grn_requests SET 
           status = 'approved', 
           approval_date = NOW(), 
           approved_by = ?
           WHERE id = ?`,
          [userId, id]
        )

        await connection.query(
          `INSERT INTO grn_request_logs (grn_request_id, action, status_from, status_to, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [id, 'INVENTORY_APPROVED', 'awaiting_inventory_approval', 'approved', userId]
        )

        await connection.commit()
        return this.getById(id)
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    } catch (error) {
      throw new Error(`Failed to approve GRN in inventory: ${error.message}`)
    }
  }
}

export default GRNRequestModel
