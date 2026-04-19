import { PeriodClosingModel } from './PeriodClosingModel.js'
import StockBalanceModel from './StockBalanceModel.js'
import StockLedgerModel from './StockLedgerModel.js'
import StockMovementModel from './StockMovementModel.js'

export class PurchaseOrderModel {
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  constructor(db) {
    this.db = db
  }

  /**
   * Resolve warehouse code to warehouse ID
   */
  async getWarehouseId(warehouseIdentifier) {
    if (!warehouseIdentifier) return null
    
    if (Number.isInteger(Number(warehouseIdentifier))) {
      return Number(warehouseIdentifier)
    }
    
    const [rows] = await this.db.execute(
      'SELECT id FROM warehouses WHERE warehouse_code = ? OR warehouse_name = ?',
      [warehouseIdentifier, warehouseIdentifier]
    )
    
    if (rows.length) return rows[0].id
    
    // If we can't find it and it's not a numeric ID, throw a clear error
    if (!Number.isInteger(Number(warehouseIdentifier))) {
      throw new Error(`Warehouse '${warehouseIdentifier}' not found. Please ensure the warehouse name or code is correct.`)
    }
    
    return Number(warehouseIdentifier)
  }

  formatDate(date) {
    if (!date) return null
    try {
      const d = new Date(date)
      if (isNaN(d.getTime())) return null
      return d.toISOString().split('T')[0]
    } catch (e) {
      return null
    }
  }

  async create(data) {
    const po_no = `PO-${Date.now()}`

    try {
      const query = `INSERT INTO purchase_order 
               (po_no, mr_id, project_name, supplier_id, order_date, expected_date, currency, 
                total_value, status, shipping_address_line1, shipping_address_line2, 
                shipping_city, shipping_state, shipping_pincode, shipping_country,
                payment_terms_description, due_date, invoice_portion, payment_amount,
                advance_paid, tax_category, tax_rate, subtotal, tax_amount, final_amount,
                incoterm, shipping_rule)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      
      const params = [
        po_no,
        data.mr_id || null,
        data.project_name || null,
        data.supplier_id || null,
        this.formatDate(data.order_date) || new Date().toISOString().split('T')[0],
        this.formatDate(data.expected_date),
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
        this.formatDate(data.due_date),
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
                this.formatDate(item.schedule_date),
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
                this.formatDate(item.schedule_date)
              ]
            )
          }

          // If linked to MR, update MR item status
          if (data.mr_id) {
            await this.db.execute(
              'UPDATE material_request_item SET status = ? WHERE mr_id = ? AND item_code = ?',
              ['completed', data.mr_id, item.item_code]
            )
          }
        }

        // If linked to MR, recalculate overall MR status
        if (data.mr_id) {
          const [updatedItems] = await this.db.execute(
            'SELECT status FROM material_request_item WHERE mr_id = ?',
            [data.mr_id]
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
            [mrStatus, data.mr_id]
          )
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
                COALESCE(CONCAT_WS(' ', em.first_name, em.last_name), c.name, u.full_name, mr.requested_by_id) as requested_by_name,
                COALESCE(po.project_name, sso.project_name) as project_name,
                (SELECT COUNT(*) FROM purchase_receipt WHERE po_no = po.po_no) as grn_count,
                (SELECT COUNT(*) FROM grn_requests WHERE po_no = po.po_no AND status != 'rejected') as grn_request_count,
                COALESCE(
                  i_resolved.name,
                  pp_fg.item_name, 
                  pp_sa.item_name, 
                  jc_wo.item_name, 
                  i_bom.name, 
                  mr.items_notes
                ) as finished_goods_name
         FROM purchase_order po
         LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
         LEFT JOIN material_request mr ON po.mr_id = mr.mr_id
         LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
         LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
         LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
         LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
         LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
         LEFT JOIN bom b ON pp.bom_id = b.bom_id
         LEFT JOIN item i_bom ON b.item_code = i_bom.item_code
         LEFT JOIN (
           SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_fg GROUP BY plan_id
         ) pp_fg ON mr.production_plan_id = pp_fg.plan_id
         LEFT JOIN (
           SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_sub_assembly GROUP BY plan_id
         ) pp_sa ON mr.production_plan_id = pp_sa.plan_id
         LEFT JOIN (
           SELECT jc.mr_id, ANY_VALUE(wo.item_code) as item_code, ANY_VALUE(i.name) as item_name 
           FROM job_card jc 
           JOIN work_order wo ON jc.work_order_id = wo.wo_id
           JOIN item i ON wo.item_code = i.item_code
           WHERE jc.mr_id IS NOT NULL
           GROUP BY jc.mr_id
         ) jc_wo ON mr.mr_id = jc_wo.mr_id
         LEFT JOIN item i_resolved ON i_resolved.item_code = COALESCE(
           pp_fg.item_code,
           pp_sa.item_code,
           jc_wo.item_code,
           b.item_code,
           TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(mr.items_notes, 'Item: [^\\n\\r]+'), 'Item: ', ''))
         )
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
                      COALESCE(poi_agg.total_ordered_qty, 0) as total_ordered_qty,
                      COALESCE(pr_agg.receipt_count, 0) as receipt_count,
                      COALESCE(grn_agg.pending_grn_count, 0) as pending_grn_count,
                      COALESCE(po.project_name, sso.project_name) as project_name,
                      COALESCE(
                        i_resolved.name,
                        pp_fg.item_name, 
                        pp_sa.item_name, 
                        jc_wo.item_name, 
                        i_bom.name, 
                        mr.items_notes
                      ) as finished_goods_name
                   FROM purchase_order po
                   LEFT JOIN supplier s ON po.supplier_id = s.supplier_id
                   LEFT JOIN material_request mr ON po.mr_id = mr.mr_id
                   LEFT JOIN employee_master em ON mr.requested_by_id = em.employee_id
                   LEFT JOIN contact c ON mr.requested_by_id = c.contact_id 
                   LEFT JOIN users u ON mr.requested_by_id = CAST(u.user_id AS CHAR) COLLATE utf8mb4_0900_ai_ci OR mr.requested_by_id = u.full_name
                   LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
                   LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
                   LEFT JOIN bom b ON pp.bom_id = b.bom_id
                   LEFT JOIN item i_bom ON b.item_code = i_bom.item_code
                   LEFT JOIN (
                     SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_fg GROUP BY plan_id
                   ) pp_fg ON mr.production_plan_id = pp_fg.plan_id
                   LEFT JOIN (
                     SELECT plan_id, ANY_VALUE(item_code) as item_code, ANY_VALUE(item_name) as item_name FROM production_plan_sub_assembly GROUP BY plan_id
                   ) pp_sa ON mr.production_plan_id = pp_sa.plan_id
                   LEFT JOIN (
                     SELECT jc.mr_id, ANY_VALUE(wo.item_code) as item_code, ANY_VALUE(i.name) as item_name 
                     FROM job_card jc 
                     JOIN work_order wo ON jc.work_order_id = wo.wo_id
                     JOIN item i ON wo.item_code = i.item_code
                     WHERE jc.mr_id IS NOT NULL
                     GROUP BY jc.mr_id
                   ) jc_wo ON mr.mr_id = jc_wo.mr_id
                   LEFT JOIN item i_resolved ON i_resolved.item_code = COALESCE(
                     pp_fg.item_code,
                     pp_sa.item_code,
                     jc_wo.item_code,
                     b.item_code,
                     TRIM(REGEXP_REPLACE(REGEXP_SUBSTR(mr.items_notes, 'Item: [^\\n\\r]+'), 'Item: ', ''))
                   )
                   LEFT JOIN (
                      SELECT po_no, 
                             SUM(received_qty) as total_received_qty,
                             SUM(qty) as total_ordered_qty
                      FROM purchase_order_item
                      GROUP BY po_no
                   ) poi_agg ON po.po_no = poi_agg.po_no
                   LEFT JOIN (
                      SELECT po_no, COUNT(*) as receipt_count
                      FROM purchase_receipt
                      GROUP BY po_no
                   ) pr_agg ON po.po_no = pr_agg.po_no
                   LEFT JOIN (
                      SELECT po_no, COUNT(*) as pending_grn_count
                      FROM grn_requests
                      WHERE status = 'pending'
                      GROUP BY po_no
                   ) grn_agg ON po.po_no = grn_agg.po_no
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
        'incoterm', 'shipping_rule', 'project_name'
      ]
      const updateFields = []

      const dateFields = ['expected_date', 'order_date', 'due_date']
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = ?`)
          if (dateFields.includes(field)) {
            params.push(this.formatDate(data[field]))
          } else {
            params.push(data[field])
          }
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
                this.formatDate(item.schedule_date),
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
                this.formatDate(item.schedule_date)
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
    const connection = await this.db.getConnection()
    try {
      await connection.beginTransaction()

      // Get PO details first to check status and mr_id
      const [poRows] = await connection.execute(
        `SELECT status, mr_id FROM purchase_order WHERE po_no = ?`, 
        [po_no]
      )

      if (poRows.length === 0) {
        throw new Error('Purchase Order not found')
      }

      const po = poRows[0]
      if (po.status !== 'draft') {
        throw new Error('Only draft Purchase Orders can be deleted')
      }

      // Get items to reset MR item status if needed
      const [poItems] = await connection.execute(
        `SELECT item_code FROM purchase_order_item WHERE po_no = ?`,
        [po_no]
      )

      // Delete items first
      await connection.execute(`DELETE FROM purchase_order_item WHERE po_no = ?`, [po_no])
      
      // Delete PO
      await connection.execute(`DELETE FROM purchase_order WHERE po_no = ?`, [po_no])

      // If linked to MR, reset MR items status and MR overall status
      if (po.mr_id) {
        for (const item of poItems) {
          await connection.execute(
            'UPDATE material_request_item SET status = NULL WHERE mr_id = ? AND item_code = ?',
            [po.mr_id, item.item_code]
          )
        }

        // Recalculate MR status
        const [mrItems] = await connection.execute(
          'SELECT status FROM material_request_item WHERE mr_id = ?',
          [po.mr_id]
        )

        const allCompleted = mrItems.every(i => i.status === 'completed')
        const anyCompleted = mrItems.some(i => i.status === 'completed')
        
        let mrStatus = 'approved'
        if (allCompleted && mrItems.length > 0) {
          mrStatus = 'completed'
        } else if (anyCompleted) {
          mrStatus = 'partial'
        }

        await connection.execute(
          'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
          [mrStatus, po.mr_id]
        )
      }

      await connection.commit()
      return { success: true }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to delete purchase order: ${error.message}`)
    } finally {
      connection.release()
    }
  }

  async createFromMaterialRequest(mrId, items, department, purpose) {
    const connection = await this.db.getConnection()
    try {
      await connection.beginTransaction()
      console.log(`[PO Creation] Creating PO from MR: ${mrId}`)
      
      if (!items || items.length === 0) {
        throw new Error('No items provided to create Purchase Order')
      }

      const po_no = `PO-MR-${Date.now()}`
      const order_date = new Date().toISOString().split('T')[0]
      
      // Enhance items with valuation rates from item table if rate is 0
      for (const item of items) {
        if (!item.rate || parseFloat(item.rate) === 0) {
          const [itemData] = await connection.execute(
            'SELECT valuation_rate, selling_rate FROM item WHERE item_code = ?',
            [item.item_code]
          )
          if (itemData.length > 0) {
            item.rate = itemData[0].valuation_rate || itemData[0].selling_rate || 0
          }
        }
      }

      // Calculate total value from items
      const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.qty || 0) * parseFloat(item.rate || 0)), 0)
      const taxRate = 18 // Default tax rate
      const taxAmount = (subtotal * taxRate) / 100
      const finalAmount = subtotal + taxAmount

      // Fetch project name from linked sales order via MR if available
      const [mrData] = await connection.execute(
        `SELECT sso.project_name
         FROM material_request mr
         LEFT JOIN production_plan pp ON mr.production_plan_id = pp.plan_id
         LEFT JOIN selling_sales_order sso ON pp.sales_order_id = sso.sales_order_id
         WHERE mr.mr_id = ?`,
        [mrId]
      )
      const projectName = mrData.length > 0 ? mrData[0].project_name : null

      // Create the PO record with all fields
      await connection.execute(
        `INSERT INTO purchase_order 
         (po_no, mr_id, project_name, supplier_id, order_date, currency, status, 
          tax_category, tax_rate, subtotal, tax_amount, final_amount, total_value, incoterm)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          po_no,
          mrId,
          projectName,
          null, // Supplier pending
          order_date,
          'INR',
          'draft',
          'GST',
          taxRate,
          subtotal,
          taxAmount,
          finalAmount,
          finalAmount, // total_value matches final_amount
          'EXW' // Default incoterm
        ]
      )

      // Create items and update MR items
      for (const item of items) {
        try {
          const po_item_id = this.generateId()
          await connection.execute(
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
              taxRate
            ]
          )
        } catch (itemError) {
          // Fallback if po_item_id or tax_rate column doesn't exist
          await connection.execute(
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
        await connection.execute(
          'UPDATE material_request_item SET status = ? WHERE mr_id = ? AND item_code = ?',
          ['completed', mrId, item.item_code]
        )
      }

      // Check overall MR status
      const [updatedItems] = await connection.execute(
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

      await connection.execute(
        'UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?',
        [mrStatus, mrId]
      )

      await connection.commit()
      return { po_no, mr_id: mrId }
    } catch (error) {
      await connection.rollback()
      throw new Error(`Failed to create PO from Material Request: ${error.message}`)
    } finally {
      connection.release()
    }
  }

  async updateReceivedQty(po_no, items, userId = 1) {
    const connection = await this.db.getConnection()
    try {
      await connection.beginTransaction()
      console.log(`[PO Update] Updating received quantities and stock for PO: ${po_no}`)
      
      // Get PO details to check for MR link
      const [poRows] = await connection.execute(
        'SELECT mr_id, status FROM purchase_order WHERE po_no = ?',
        [po_no]
      )
      if (poRows.length === 0) throw new Error('Purchase Order not found')
      const po = poRows[0]

      for (const item of items) {
        const qtyToReceive = parseFloat(item.accepted_qty || item.received_qty) || 0
        if (qtyToReceive <= 0) continue

        // 1. Update PO item received quantity
        await connection.execute(
          `UPDATE purchase_order_item 
           SET received_qty = received_qty + ? 
           WHERE po_no = ? AND item_code = ?`,
          [qtyToReceive, po_no, item.item_code]
        )

        // 2. Update stock balance and ledger (Directly in PO flow, skipping GRN)
        const warehouseIdentifier = item.warehouse_code || 'ACCEPTED'
        const warehouseId = await this.getWarehouseId(warehouseIdentifier)
        
        // Fetch rate from PO item
        const [poiRows] = await connection.execute(
          'SELECT rate FROM purchase_order_item WHERE po_no = ? AND item_code = ?',
          [po_no, item.item_code]
        )
        const rate = poiRows.length > 0 ? poiRows[0].rate : 0

        // Check for period closing lock
        await PeriodClosingModel.checkLock(connection, new Date())

        // Update Stock Balance
        await StockBalanceModel.upsert(item.item_code, warehouseId, {
          current_qty: qtyToReceive,
          is_increment: true,
          incoming_rate: rate,
          last_receipt_date: new Date()
        }, connection)

        // Add to Stock Ledger
        await StockLedgerModel.create({
          item_code: item.item_code,
          warehouse_id: warehouseId,
          transaction_date: new Date(),
          transaction_type: 'Purchase Receipt',
          qty_in: qtyToReceive,
          qty_out: 0,
          valuation_rate: rate,
          reference_doctype: 'Purchase Order',
          reference_name: po_no,
          remarks: `Direct receipt against PO ${po_no}`,
          created_by: userId
        }, connection)

        // Create Stock Movement entry
        try {
          const transaction_no = await StockMovementModel.generateTransactionNo(connection)
          await connection.execute(
            `INSERT INTO stock_movements (
              transaction_no, item_code, warehouse_id, 
              movement_type, quantity, reference_type, reference_name, notes, status, created_by, approved_by, approved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?, ?, NOW())`,
            [
              transaction_no, 
              item.item_code, 
              warehouseId, 
              'IN',
              qtyToReceive,
              'Purchase Order',
              po_no,
              `Direct receipt for PO ${po_no}`,
              userId,
              userId
            ]
          )
        } catch (smError) {
          console.error('Failed to create stock movement entry:', smError)
        }
      }

      // Check if PO is completed
      const [poiRowsCheck] = await connection.execute(
        `SELECT qty, received_qty FROM purchase_order_item WHERE po_no = ?`,
        [po_no]
      )

      let allReceived = true
      let partiallyReceived = false

      for (const row of poiRowsCheck) {
        if (parseFloat(row.received_qty) < parseFloat(row.qty)) {
          allReceived = false
        }
        if (parseFloat(row.received_qty) > 0) {
          partiallyReceived = true
        }
      }

      const newStatus = allReceived ? 'completed' : (partiallyReceived ? 'partially_received' : 'to_receive')
      
      await connection.execute(
        `UPDATE purchase_order SET status = ? WHERE po_no = ?`,
        [newStatus, po_no]
      )

      // Update linked Material Request if exists
      if (po.mr_id) {
        // Fetch MR purpose
        const [mrRows] = await connection.execute(
          'SELECT purpose FROM material_request WHERE mr_id = ?',
          [po.mr_id]
        )
        
        if (mrRows.length > 0 && mrRows[0].purpose === 'purchase') {
          // Check if all items in MR are now available or received
          const mrFinalStatus = allReceived ? 'completed' : 'partial'
          await connection.execute(
            `UPDATE material_request SET status = ?, updated_at = NOW() WHERE mr_id = ?`,
            [mrFinalStatus, po.mr_id]
          )
        }
      }

      await connection.commit()
      return { success: true, status: newStatus }
    } catch (error) {
      await connection.rollback()
      console.error(`Error updating PO received qty and stock:`, error)
      throw error
    } finally {
      connection.release()
    }
  }
}