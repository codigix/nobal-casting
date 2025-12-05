import { v4 as uuidv4 } from 'uuid'

export class PurchaseOrderModel {
  constructor(db) {
    this.db = db
  }

  async create(data) {
    const po_no = `PO-${Date.now()}`

    try {
      let query, params
      
      if (data.tax_template_id) {
        query = `INSERT INTO purchase_order 
                 (po_no, supplier_id, order_date, expected_date, currency, tax_template_id, total_value, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        params = [
          po_no,
          data.supplier_id || null,
          data.order_date || new Date().toISOString().split('T')[0],
          data.expected_date || null,
          data.currency || 'INR',
          data.tax_template_id,
          parseFloat(data.total_value) || parseFloat(data.subtotal) || 0,
          'draft'
        ]
      } else {
        query = `INSERT INTO purchase_order 
                 (po_no, supplier_id, order_date, expected_date, currency, total_value, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
        params = [
          po_no,
          data.supplier_id || null,
          data.order_date || new Date().toISOString().split('T')[0],
          data.expected_date || null,
          data.currency || 'INR',
          parseFloat(data.total_value) || parseFloat(data.subtotal) || 0,
          'draft'
        ]
      }

      await this.db.execute(query, params)

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          try {
            const po_item_id = uuidv4()
            await this.db.execute(
              `INSERT INTO purchase_order_item 
               (po_item_id, po_no, item_code, qty, uom, rate, schedule_date)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                po_item_id,
                po_no,
                item.item_code || null,
                parseFloat(item.qty) || null,
                item.uom || null,
                parseFloat(item.rate) || null,
                item.schedule_date || null
              ]
            )
          } catch (itemError) {
            // If po_item_id column doesn't exist, try without it
            if (itemError.message.includes('po_item_id')) {
              await this.db.execute(
                `INSERT INTO purchase_order_item 
                 (po_no, item_code, qty, uom, rate, schedule_date)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  po_no,
                  item.item_code || null,
                  parseFloat(item.qty) || null,
                  item.uom || null,
                  parseFloat(item.rate) || null,
                  item.schedule_date || null
                ]
              )
            } else {
              throw itemError
            }
          }
        }
      }

      return { po_no, status: 'created' }
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error.message}`)
    }
  }

  async getById(po_no) {
    try {
      const [pos] = await this.db.execute(
        `SELECT po.*, s.name as supplier_name, s.gstin
         FROM purchase_order po
         JOIN supplier s ON po.supplier_id = s.supplier_id
         WHERE po.po_no = ?`,
        [po_no]
      )

      if (pos.length === 0) return null

      const [items] = await this.db.execute(
        `SELECT poi.*, i.name as item_name, i.uom as item_uom
         FROM purchase_order_item poi
         JOIN item i ON poi.item_code = i.item_code
         WHERE poi.po_no = ?`,
        [po_no]
      )

      return { ...pos[0], items }
    } catch (error) {
      throw new Error(`Failed to fetch purchase order: ${error.message}`)
    }
  }

  async getAll(filters = {}) {
    try {
      let query = `SELECT po.*, s.name as supplier_name, s.gstin
                   FROM purchase_order po
                   JOIN supplier s ON po.supplier_id = s.supplier_id
                   WHERE 1=1`
      const params = []

      if (filters.supplier_id) {
        query += ` AND po.supplier_id = ?`
        params.push(filters.supplier_id)
      }

      if (filters.status) {
        query += ` AND po.status = ?`
        params.push(filters.status)
      }

      if (filters.order_date_from) {
        query += ` AND po.order_date >= ?`
        params.push(filters.order_date_from)
      }

      if (filters.order_date_to) {
        query += ` AND po.order_date <= ?`
        params.push(filters.order_date_to)
      }

      const limit = filters.limit || 50
      const offset = filters.offset || 0
      query += ` ORDER BY po.created_at DESC LIMIT ${limit} OFFSET ${offset}`

      const [pos] = await this.db.execute(query, params)
      return pos
    } catch (error) {
      throw new Error(`Failed to fetch purchase orders: ${error.message}`)
    }
  }

  async update(po_no, data) {
    try {
      let updateQuery = `UPDATE purchase_order SET `
      const params = []

      const allowedFields = [
        'expected_date', 'status', 'currency', 'tax_template_id', 'total_value', 'taxes_amount'
      ]
      const updateFields = []

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = ?`)
          params.push(data[field])
        }
      }

      if (updateFields.length === 0) return { success: true }

      updateQuery += updateFields.join(', ') + ` WHERE po_no = ?`
      params.push(po_no)

      const [result] = await this.db.execute(updateQuery, params)
      return { affectedRows: result.affectedRows }
    } catch (error) {
      throw new Error(`Failed to update purchase order: ${error.message}`)
    }
  }

  async calculateTotal(po_no) {
    try {
      const [result] = await this.db.execute(
        `SELECT SUM(qty * rate) as total FROM purchase_order_item WHERE po_no = ?`,
        [po_no]
      )
      return result[0]?.total || 0
    } catch (error) {
      throw new Error(`Failed to calculate total: ${error.message}`)
    }
  }

  async submit(po_no) {
    try {
      const total = await this.calculateTotal(po_no)
      await this.db.execute(
        `UPDATE purchase_order SET status = 'submitted', total_value = ? WHERE po_no = ?`,
        [total, po_no]
      )
      return { success: true, total_value: total }
    } catch (error) {
      throw new Error(`Failed to submit purchase order: ${error.message}`)
    }
  }

  async createPaymentReminder(reminderId, po_no, supplier_id, due_date, payment_amount) {
    try {
      await this.db.execute(
        `INSERT INTO payment_reminder 
         (reminder_id, po_no, supplier_id, due_date, payment_amount, reminder_status, sent_to_dept)
         VALUES (?, ?, ?, ?, ?, 'pending', 'Accounts')`,
        [reminderId, po_no, supplier_id, due_date, payment_amount]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to create payment reminder: ${error.message}`)
    }
  }

  async getPaymentReminders(filters = {}) {
    try {
      let query = `SELECT pr.*, po.final_amount, s.name as supplier_name, s.email as supplier_email
                   FROM payment_reminder pr
                   JOIN purchase_order po ON pr.po_no = po.po_no
                   JOIN supplier s ON pr.supplier_id = s.supplier_id
                   WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ` AND pr.reminder_status = ?`
        params.push(filters.status)
      }

      if (filters.po_no) {
        query += ` AND pr.po_no = ?`
        params.push(filters.po_no)
      }

      query += ` ORDER BY pr.due_date ASC`
      const [reminders] = await this.db.execute(query, params)
      return reminders
    } catch (error) {
      throw new Error(`Failed to fetch payment reminders: ${error.message}`)
    }
  }

  async updateReminderStatus(reminder_id, status) {
    try {
      await this.db.execute(
        `UPDATE payment_reminder SET reminder_status = ?, sent_date = CURRENT_TIMESTAMP WHERE reminder_id = ?`,
        [status, reminder_id]
      )
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to update reminder status: ${error.message}`)
    }
  }

  async delete(po_no) {
    try {
      // Delete items first
      await this.db.execute(`DELETE FROM purchase_order_item WHERE po_no = ?`, [po_no])
      // Delete PO
      await this.db.execute(`DELETE FROM purchase_order WHERE po_no = ?`, [po_no])
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to delete purchase order: ${error.message}`)
    }
  }
}