export class PurchaseOrderModel {
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  constructor(db) {
    this.db = db
  }

  async create(data) {
    const po_no = `PO-${Date.now()}`

    try {
      const query = `INSERT INTO purchase_order 
               (po_no, mr_id, supplier_id, order_date, expected_date, currency, 
                total_value, status, shipping_address_line1, shipping_address_line2, 
                shipping_city, shipping_state, shipping_pincode, shipping_country,
                payment_terms_description, due_date, invoice_portion, payment_amount,
                advance_paid, tax_category, tax_rate, subtotal, tax_amount, final_amount,
                incoterm, shipping_rule)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      
      const params = [
        po_no,
        data.mr_id || null,
        data.supplier_id || null,
        data.order_date || new Date().toISOString().split('T')[0],
        data.expected_date || null,
        data.currency || 'INR',
        parseFloat(data.total_value) || parseFloat(data.final_amount) || 0,
        'draft',
        data.shipping_address_line1 || null,
        data.shipping_address_line2 || null,
        data.shipping_city || null,
        data.shipping_state || null,
        data.shipping_pincode || null,
        data.shipping_country || 'India',
        data.payment_terms_description || null,
        data.due_date || null,
        parseFloat(data.invoice_portion) || 100,
        parseFloat(data.payment_amount) || 0,
        parseFloat(data.advance_paid) || 0,
        data.tax_category || 'GST',
        parseFloat(data.tax_rate) || 0,
        parseFloat(data.subtotal) || 0,
        parseFloat(data.tax_amount) || 0,
        parseFloat(data.final_amount) || 0,
        data.incoterm || 'EXW',
        data.shipping_rule || null
      ]

      await this.db.execute(query, params)

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const po_item_id = this.generateId()
          try {
            await this.db.execute(
              `INSERT INTO purchase_order_item 
               (po_item_id, po_no, item_code, qty, uom, rate, schedule_date, tax_rate)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                po_item_id,
                po_no,
                item.item_code || null,
                parseFloat(item.qty) || null,
                item.uom || null,
                parseFloat(item.rate) || null,
                item.schedule_date || null,
                parseFloat(item.tax_rate) || 0
              ]
            )
          } catch (itemError) {
            // Fallback if po_item_id or tax_rate column doesn't exist
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
        `SELECT po.*, s.name as supplier_name, s.gstin, 
                mr.department, mr.purpose,
                COALESCE(CONCAT_WS(' ', em.first_name, em.last_name), c.name, u.full_name, mr.requested_by_id) as requested_by_name
         FROM purchase_order po
         LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
         LEFT JOIN material_request mr ON po.mr_id = mr.mr_id
         LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
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
      let query = `SELECT 
                      po.*, 
                      s.name as supplier_name, 
                      s.gstin, 
                      mr.department, 
                      mr.purpose,
                      COALESCE(CONCAT_WS(' ', em.first_name, em.last_name), c.name, u.full_name, mr.requested_by_id) as requested_by_name,
                      COALESCE(poi_agg.total_received_qty, 0) as total_received_qty,
                      COALESCE(poi_agg.total_ordered_qty, 0) as total_ordered_qty
                   FROM purchase_order po
                   LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                   LEFT JOIN material_request mr ON po.mr_id = mr.mr_id
                   LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
                   LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
                   LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
                   LEFT JOIN (
                      SELECT po_no, 
                             SUM(received_qty) as total_received_qty,
                             SUM(qty) as total_ordered_qty
                      FROM purchase_order_item
                      GROUP BY po_no
                   ) poi_agg ON po.po_no = poi_agg.po_no
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
        'expected_date', 'status', 'currency', 'total_value', 'taxes_amount',
        'supplier_id', 'order_date', 'shipping_address_line1', 'shipping_address_line2',
        'shipping_city', 'shipping_state', 'shipping_pincode', 'shipping_country',
        'payment_terms_description', 'due_date', 'invoice_portion', 'payment_amount',
        'advance_paid', 'tax_category', 'tax_rate', 'subtotal', 'tax_amount', 'final_amount',
        'incoterm', 'shipping_rule'
      ]
      const updateFields = []

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = ?`)
          params.push(data[field])
        }
      }

      if (updateFields.length > 0) {
        updateQuery += updateFields.join(', ') + ` WHERE po_no = ?`
        params.push(po_no)
        await this.db.execute(updateQuery, params)
      }

      // Handle items update
      if (data.items && Array.isArray(data.items)) {
        // Delete existing items
        await this.db.execute(`DELETE FROM purchase_order_item WHERE po_no = ?`, [po_no])

        // Insert new items
        for (const item of data.items) {
          const po_item_id = this.generateId()
          try {
            await this.db.execute(
              `INSERT INTO purchase_order_item 
               (po_item_id, po_no, item_code, qty, uom, rate, schedule_date, tax_rate)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                po_item_id,
                po_no,
                item.item_code || null,
                parseFloat(item.qty) || null,
                item.uom || null,
                parseFloat(item.rate) || null,
                item.schedule_date || null,
                parseFloat(item.tax_rate) || 0
              ]
            )
          } catch (itemError) {
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
          }
        }
      }

      return { success: true }
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

  async createFromMaterialRequest(mrId, items, department, purpose) {
    try {
      console.log(`[PO Creation] Creating PO from MR: ${mrId}`)
      
      const po_no = `PO-MR-${Date.now()}`
      const order_date = new Date().toISOString().split('T')[0]
      
      // Create the PO record with all fields
      await this.db.execute(
        `INSERT INTO purchase_order 
         (po_no, mr_id, supplier_id, order_date, currency, status, 
          tax_category, tax_rate, subtotal, tax_amount, final_amount, incoterm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          po_no,
          mrId,
          null, // Supplier pending
          order_date,
          'INR',
          'draft',
          'GST',
          18,   // Default tax rate
          0,    // Subtotal will be updated if needed or calculated on edit
          0,    // Tax amount
          0,    // Final amount
          'EXW' // Default incoterm
        ]
      )

      // Create items and update MR items
      for (const item of items) {
        try {
          const po_item_id = this.generateId()
          await this.db.execute(
            `INSERT INTO purchase_order_item 
             (po_item_id, po_no, item_code, qty, uom, rate, tax_rate)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              po_item_id,
              po_no,
              item.item_code,
              item.qty,
              item.uom || 'Kg',
              item.rate || 0,
              18 // Default tax rate
            ]
          )
        } catch (itemError) {
          // Fallback if po_item_id or tax_rate column doesn't exist
          await this.db.execute(
            `INSERT INTO purchase_order_item 
             (po_no, item_code, qty, uom, rate)
             VALUES (?, ?, ?, ?, ?)`,
            [
              po_no,
              item.item_code,
              item.qty,
              item.uom || 'Kg',
              item.rate || 0
            ]
          )
        }

        // Update MR item status to completed for purchase purpose
        await this.db.execute(
          'UPDATE material_request_item SET status = ? WHERE mr_id = ? AND item_code = ?',
          ['completed', mrId, item.item_code]
        )
      }

      // Check overall MR status
      const [updatedItems] = await this.db.execute(
        'SELECT status FROM material_request_item WHERE mr_id = ?',
        [mrId]
      )
      
      const allCompleted = updatedItems.every(i => i.status === 'completed')
      const anyCompleted = updatedItems.some(i => i.status === 'completed')
      
      let mrStatus = 'approved'
      if (allCompleted) {
        mrStatus = 'completed'
      } else if (anyCompleted) {
        mrStatus = 'partial'
      }

      await this.db.execute(
        'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
        [mrStatus, mrId]
      )

      return { po_no, mr_id: mrId }
    } catch (error) {
      throw new Error(`Failed to create PO from Material Request: ${error.message}`)
    }
  }

  async updateReceivedQty(po_no, items) {
    try {
      console.log(`[PO Update] Updating received quantities for PO: ${po_no}`)
      
      for (const item of items) {
        await this.db.execute(
          `UPDATE purchase_order_item 
           SET received_qty = received_qty + ? 
           WHERE po_no = ? AND item_code = ?`,
          [parseFloat(item.accepted_qty) || 0, po_no, item.item_code]
        )
      }

      // Check if PO is completed
      const [poiRows] = await this.db.execute(
        `SELECT qty, received_qty FROM purchase_order_item WHERE po_no = ?`,
        [po_no]
      )

      let allReceived = true
      let partiallyReceived = false

      for (const row of poiRows) {
        if (row.received_qty < row.qty) {
          allReceived = false
        }
        if (row.received_qty > 0) {
          partiallyReceived = true
        }
      }

      const newStatus = allReceived ? 'completed' : (partiallyReceived ? 'partially_received' : 'to_receive')
      
      await this.db.execute(
        `UPDATE purchase_order SET status = ? WHERE po_no = ?`,
        [newStatus, po_no]
      )

      return { success: true, status: newStatus }
    } catch (error) {
      console.error(`Error updating PO received qty:`, error)
      throw error
    }
  }
}