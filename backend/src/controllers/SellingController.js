export class SellingController {
  // ============================================
  // CUSTOMER ENDPOINTS
  // ============================================

  static async createCustomer(req, res) {
    const db = req.app.locals.db
    const { name, email, phone, gstin, gst_no, billing_address, shipping_address, credit_limit, status } = req.body

    try {
      // Validation
      if (!name) {
        return res.status(400).json({ error: 'Customer name is required' })
      }

      if (email && !isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }

      const customer_id = `CUST-${Date.now()}`
      const gstinValue = gstin || gst_no // Accept both field names

      await db.execute(
        `INSERT INTO selling_customer 
         (customer_id, name, email, phone, gstin, billing_address, shipping_address, credit_limit, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_id,
          name,
          email || null,
          phone || null,
          gstinValue || null,
          billing_address || null,
          shipping_address || null,
          credit_limit || 0,
          status || 'active'
        ]
      )

      res.status(201).json({
        success: true,
        data: {
          customer_id,
          name,
          email,
          phone,
          gstin: gstinValue,
          billing_address,
          shipping_address,
          credit_limit: credit_limit || 0,
          status: status || 'active'
        }
      })
    } catch (error) {
      console.error('Error creating customer:', error)
      res.status(500).json({ error: 'Failed to create customer', details: error.message })
    }
  }

  static async getCustomers(req, res) {
    const db = req.app.locals.db
    const { name, status } = req.query

    try {
      let query = 'SELECT * FROM selling_customer WHERE deleted_at IS NULL'
      const params = []

      if (name) {
        query += ' AND name LIKE ?'
        params.push(`%${name}%`)
      }
      if (status) {
        query += ' AND status = ?'
        params.push(status)
      }

      query += ' ORDER BY created_at DESC'

      const [customers] = await db.execute(query, params)
      res.json({ success: true, data: customers })
    } catch (error) {
      console.error('Error fetching customers:', error)
      res.status(500).json({ error: 'Failed to fetch customers', details: error.message })
    }
  }

  static async getCustomerById(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      const [rows] = await db.execute(
        'SELECT * FROM selling_customer WHERE customer_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!rows.length) {
        return res.status(404).json({ error: 'Customer not found' })
      }

      res.json({ success: true, data: rows[0] })
    } catch (error) {
      console.error('Error fetching customer:', error)
      res.status(500).json({ error: 'Failed to fetch customer', details: error.message })
    }
  }

  // ============================================
  // QUOTATION ENDPOINTS
  // ============================================

  static async createQuotation(req, res) {
    const db = req.app.locals.db
    const { customer_id, amount, total_value, validity_date, valid_till, notes } = req.body

    try {
      // Accept both field name variations
      const finalAmount = amount || total_value
      const finalDate = validity_date || valid_till

      if (!customer_id || !finalAmount) {
        return res.status(400).json({ error: 'Customer and amount are required' })
      }

      // Validate customer exists
      const [customerCheck] = await db.execute(
        'SELECT customer_id FROM selling_customer WHERE customer_id = ? AND deleted_at IS NULL',
        [customer_id]
      )

      if (!customerCheck.length) {
        return res.status(400).json({ error: 'Customer not found. Please select a valid customer.' })
      }

      const quotation_id = `QT-${Date.now()}`

      await db.execute(
        `INSERT INTO selling_quotation 
         (quotation_id, customer_id, amount, validity_date, notes, status)
         VALUES (?, ?, ?, ?, ?, 'draft')`,
        [quotation_id, customer_id, finalAmount, finalDate || null, notes || null]
      )

      res.status(201).json({
        success: true,
        data: {
          quotation_id,
          customer_id,
          amount: finalAmount,
          validity_date: finalDate,
          notes,
          status: 'draft'
        }
      })
    } catch (error) {
      console.error('Error creating quotation:', error)
      res.status(500).json({ error: 'Failed to create quotation', details: error.message })
    }
  }

  static async getQuotations(req, res) {
    const db = req.app.locals.db
    const { customer_id, status } = req.query

    try {
      let query = `SELECT sq.*, sc.name as customer_name 
                   FROM selling_quotation sq
                   LEFT JOIN selling_customer sc ON sq.customer_id = sc.customer_id
                   WHERE sq.deleted_at IS NULL`
      const params = []

      if (customer_id) {
        query += ' AND sq.customer_id = ?'
        params.push(customer_id)
      }
      if (status) {
        query += ' AND sq.status = ?'
        params.push(status)
      }

      query += ' ORDER BY sq.created_at DESC'

      const [quotations] = await db.execute(query, params)
      res.json({ success: true, data: quotations })
    } catch (error) {
      console.error('Error fetching quotations:', error)
      res.status(500).json({ error: 'Failed to fetch quotations', details: error.message })
    }
  }

  static async sendQuotation(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      // Check if quotation exists
      const [quotation] = await db.execute(
        'SELECT * FROM selling_quotation WHERE quotation_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!quotation.length) {
        return res.status(404).json({ error: 'Quotation not found' })
      }

      // Update status to "sent"
      await db.execute(
        'UPDATE selling_quotation SET status = ?, updated_at = NOW() WHERE quotation_id = ?',
        ['sent', id]
      )

      // Fetch updated quotation with customer info
      const [updated] = await db.execute(
        `SELECT sq.*, sc.name as customer_name 
         FROM selling_quotation sq
         LEFT JOIN selling_customer sc ON sq.customer_id = sc.customer_id
         WHERE sq.quotation_id = ?`,
        [id]
      )

      res.json({ success: true, data: updated[0] })
    } catch (error) {
      console.error('Error sending quotation:', error)
      res.status(500).json({ error: 'Failed to send quotation', details: error.message })
    }
  }

  static async deleteQuotation(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      // Check if quotation exists
      const [quotation] = await db.execute(
        'SELECT * FROM selling_quotation WHERE quotation_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!quotation.length) {
        return res.status(404).json({ error: 'Quotation not found' })
      }

      // Soft delete
      await db.execute(
        'UPDATE selling_quotation SET deleted_at = NOW() WHERE quotation_id = ?',
        [id]
      )

      res.json({ success: true, message: 'Quotation deleted successfully' })
    } catch (error) {
      console.error('Error deleting quotation:', error)
      res.status(500).json({ error: 'Failed to delete quotation', details: error.message })
    }
  }

  // ============================================
  // SALES ORDER ENDPOINTS
  // ============================================

  static async createSalesOrder(req, res) {
    const db = req.app.locals.db
    const { customer_id, quotation_id, order_amount, total_value, delivery_date, order_terms, terms_conditions } = req.body

    try {
      // Accept both field name variations
      const finalAmount = order_amount || total_value
      const finalTerms = order_terms || terms_conditions

      if (!customer_id || !finalAmount) {
        return res.status(400).json({ error: 'Customer and order amount are required' })
      }

      // Validate customer exists
      const [customerCheck] = await db.execute(
        'SELECT customer_id FROM selling_customer WHERE customer_id = ? AND deleted_at IS NULL',
        [customer_id]
      )

      if (!customerCheck.length) {
        return res.status(400).json({ error: 'Customer not found. Please select a valid customer.' })
      }

      const sales_order_id = `SO-${Date.now()}`

      await db.execute(
        `INSERT INTO selling_sales_order 
         (sales_order_id, customer_id, quotation_id, order_amount, delivery_date, order_terms, status)
         VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
        [sales_order_id, customer_id, quotation_id || null, finalAmount, delivery_date || null, finalTerms || null]
      )

      res.status(201).json({
        success: true,
        data: {
          sales_order_id,
          customer_id,
          quotation_id,
          order_amount: finalAmount,
          total_value: finalAmount,
          delivery_date,
          order_terms: finalTerms,
          status: 'draft'
        }
      })
    } catch (error) {
      console.error('Error creating sales order:', error)
      res.status(500).json({ error: 'Failed to create sales order', details: error.message })
    }
  }

  static async getSalesOrders(req, res) {
    const db = req.app.locals.db
    const { customer_id, status } = req.query

    try {
      let query = `SELECT sso.*, sso.order_amount as total_value, sc.name as customer_name 
                   FROM selling_sales_order sso
                   LEFT JOIN selling_customer sc ON sso.customer_id = sc.customer_id
                   WHERE sso.deleted_at IS NULL`
      const params = []

      if (customer_id) {
        query += ' AND sso.customer_id = ?'
        params.push(customer_id)
      }
      if (status) {
        query += ' AND sso.status = ?'
        params.push(status)
      }

      query += ' ORDER BY sso.created_at DESC'

      const [orders] = await db.execute(query, params)
      res.json({ success: true, data: orders })
    } catch (error) {
      console.error('Error fetching sales orders:', error)
      res.status(500).json({ error: 'Failed to fetch sales orders', details: error.message })
    }
  }

  static async confirmSalesOrder(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      const [rows] = await db.execute(
        'SELECT sales_order_id, status FROM selling_sales_order WHERE sales_order_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!rows.length) {
        return res.status(404).json({ error: 'Sales order not found' })
      }

      if (rows[0].status === 'confirmed') {
        return res.json({ success: true, data: rows[0] })
      }

      await db.execute(
        'UPDATE selling_sales_order SET status = ?, confirmed_at = NOW(), updated_at = NOW() WHERE sales_order_id = ?',
        ['confirmed', id]
      )

      const [updated] = await db.execute(
        `SELECT sso.*, sso.order_amount as total_value, sc.name as customer_name 
         FROM selling_sales_order sso
         LEFT JOIN selling_customer sc ON sso.customer_id = sc.customer_id
         WHERE sso.sales_order_id = ?`,
        [id]
      )

      res.json({ success: true, data: updated[0] })
    } catch (error) {
      console.error('Error confirming sales order:', error)
      res.status(500).json({ error: 'Failed to confirm sales order', details: error.message })
    }
  }

  static async getSalesOrderById(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      const [orders] = await db.execute(
        `SELECT sso.*, sso.order_amount as total_value, sc.name as customer_name 
         FROM selling_sales_order sso
         LEFT JOIN selling_customer sc ON sso.customer_id = sc.customer_id
         WHERE sso.sales_order_id = ? AND sso.deleted_at IS NULL`,
        [id]
      )

      if (!orders.length) {
        return res.status(404).json({ error: 'Sales order not found' })
      }

      res.json({ success: true, data: orders[0] })
    } catch (error) {
      console.error('Error fetching sales order:', error)
      res.status(500).json({ error: 'Failed to fetch sales order', details: error.message })
    }
  }

  static async updateSalesOrder(req, res) {
    const db = req.app.locals.db
    const { id } = req.params
    const { order_amount, total_value, delivery_date, order_terms, status } = req.body

    try {
      // Check if order exists
      const [orderCheck] = await db.execute(
        'SELECT sales_order_id FROM selling_sales_order WHERE sales_order_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!orderCheck.length) {
        return res.status(404).json({ error: 'Sales order not found' })
      }

      // Build update query dynamically
      const updates = []
      const values = []

      if (order_amount !== undefined || total_value !== undefined) {
        updates.push('order_amount = ?')
        values.push(order_amount || total_value)
      }
      if (delivery_date !== undefined) {
        updates.push('delivery_date = ?')
        values.push(delivery_date)
      }
      if (order_terms !== undefined) {
        updates.push('order_terms = ?')
        values.push(order_terms)
      }
      if (status !== undefined) {
        updates.push('status = ?')
        values.push(status)
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }

      updates.push('updated_at = NOW()')
      values.push(id)

      const query = `UPDATE selling_sales_order SET ${updates.join(', ')} WHERE sales_order_id = ?`
      await db.execute(query, values)

      // Fetch updated order with customer info
      const [updated] = await db.execute(
        `SELECT sso.*, sso.order_amount as total_value, sc.name as customer_name 
         FROM selling_sales_order sso
         LEFT JOIN selling_customer sc ON sso.customer_id = sc.customer_id
         WHERE sso.sales_order_id = ?`,
        [id]
      )

      res.json({ success: true, data: updated[0] })
    } catch (error) {
      console.error('Error updating sales order:', error)
      res.status(500).json({ error: 'Failed to update sales order', details: error.message })
    }
  }

  static async deleteSalesOrder(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      // Check if order exists
      const [orderCheck] = await db.execute(
        'SELECT sales_order_id FROM selling_sales_order WHERE sales_order_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!orderCheck.length) {
        return res.status(404).json({ error: 'Sales order not found' })
      }

      // Soft delete
      await db.execute(
        'UPDATE selling_sales_order SET deleted_at = NOW() WHERE sales_order_id = ?',
        [id]
      )

      res.json({ success: true, message: 'Sales order deleted successfully' })
    } catch (error) {
      console.error('Error deleting sales order:', error)
      res.status(500).json({ error: 'Failed to delete sales order', details: error.message })
    }
  }

  // ============================================
  // DELIVERY NOTE ENDPOINTS
  // ============================================

  static async createDeliveryNote(req, res) {
    const db = req.app.locals.db
    const { sales_order_id, delivery_date, quantity, total_qty, driver_name, vehicle_info, vehicle_no, remarks } = req.body

    try {
      // Accept both field name variations
      const finalQuantity = quantity || total_qty
      const finalVehicle = vehicle_info || vehicle_no

      if (!sales_order_id || !delivery_date) {
        return res.status(400).json({ error: 'Sales order and delivery date are required' })
      }

      // Validate sales order exists
      const [orderCheck] = await db.execute(
        'SELECT sales_order_id FROM selling_sales_order WHERE sales_order_id = ? AND deleted_at IS NULL',
        [sales_order_id]
      )

      if (!orderCheck.length) {
        return res.status(400).json({ error: 'Sales order not found. Please select a valid order.' })
      }

      const delivery_note_id = `DN-${Date.now()}`

      await db.execute(
        `INSERT INTO selling_delivery_note 
         (delivery_note_id, sales_order_id, delivery_date, quantity, driver_name, vehicle_info, remarks, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          delivery_note_id,
          sales_order_id,
          delivery_date,
          finalQuantity || null,
          driver_name || null,
          finalVehicle || null,
          remarks || null
        ]
      )

      res.status(201).json({
        success: true,
        data: {
          delivery_note_id,
          sales_order_id,
          delivery_date,
          quantity: finalQuantity,
          driver_name,
          vehicle_info: finalVehicle,
          remarks,
          status: 'draft'
        }
      })
    } catch (error) {
      console.error('Error creating delivery note:', error)
      res.status(500).json({ error: 'Failed to create delivery note', details: error.message })
    }
  }

  static async getDeliveryNotes(req, res) {
    const db = req.app.locals.db
    const { sales_order_id, status } = req.query

    try {
      let query = `SELECT sdn.*, sso.sales_order_id 
                   FROM selling_delivery_note sdn
                   LEFT JOIN selling_sales_order sso ON sdn.sales_order_id = sso.sales_order_id
                   WHERE sdn.deleted_at IS NULL`
      const params = []

      if (sales_order_id) {
        query += ' AND sdn.sales_order_id = ?'
        params.push(sales_order_id)
      }
      if (status) {
        query += ' AND sdn.status = ?'
        params.push(status)
      }

      query += ' ORDER BY sdn.created_at DESC'

      const [notes] = await db.execute(query, params)
      res.json({ success: true, data: notes })
    } catch (error) {
      console.error('Error fetching delivery notes:', error)
      res.status(500).json({ error: 'Failed to fetch delivery notes', details: error.message })
    }
  }

  // Get confirmed/delivered sales orders for delivery note dropdown
  static async getConfirmedOrders(req, res) {
    const db = req.app.locals.db

    try {
      const [orders] = await db.execute(
        `SELECT sales_order_id, customer_id, order_amount 
         FROM selling_sales_order 
         WHERE status IN ('confirmed', 'shipped') AND deleted_at IS NULL
         ORDER BY created_at DESC`
      )
      res.json({ success: true, data: orders })
    } catch (error) {
      console.error('Error fetching confirmed orders:', error)
      res.status(500).json({ error: 'Failed to fetch confirmed orders', details: error.message })
    }
  }

  // Get delivered delivery notes for invoice dropdown
  static async getDeliveredNotes(req, res) {
    const db = req.app.locals.db

    try {
      const [notes] = await db.execute(
        `SELECT delivery_note_id, sales_order_id 
         FROM selling_delivery_note 
         WHERE status = 'delivered' AND deleted_at IS NULL
         ORDER BY created_at DESC`
      )
      res.json({ success: true, data: notes })
    } catch (error) {
      console.error('Error fetching delivered notes:', error)
      res.status(500).json({ error: 'Failed to fetch delivered notes', details: error.message })
    }
  }

  // ============================================
  // INVOICE ENDPOINTS
  // ============================================

  static async createInvoice(req, res) {
    const db = req.app.locals.db
    const { delivery_note_id, invoice_date, amount, total_value, due_date, tax_rate, invoice_type } = req.body

    try {
      // Accept both field name variations
      const finalAmount = amount || total_value

      if (!delivery_note_id || !invoice_date || !finalAmount) {
        return res.status(400).json({ error: 'Delivery note, invoice date, and amount are required' })
      }

      // Validate delivery note exists
      const [noteCheck] = await db.execute(
        'SELECT delivery_note_id FROM selling_delivery_note WHERE delivery_note_id = ? AND deleted_at IS NULL',
        [delivery_note_id]
      )

      if (!noteCheck.length) {
        return res.status(400).json({ error: 'Delivery note not found. Please select a valid delivery note.' })
      }

      const invoice_id = `INV-${Date.now()}`

      await db.execute(
        `INSERT INTO selling_invoice 
         (invoice_id, delivery_note_id, invoice_date, amount, due_date, tax_rate, invoice_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          invoice_id,
          delivery_note_id,
          invoice_date,
          finalAmount,
          due_date || null,
          tax_rate || 0,
          invoice_type || 'standard'
        ]
      )

      res.status(201).json({
        success: true,
        data: {
          invoice_id,
          delivery_note_id,
          invoice_date,
          amount: finalAmount,
          due_date,
          tax_rate: tax_rate || 0,
          invoice_type: invoice_type || 'standard',
          status: 'draft'
        }
      })
    } catch (error) {
      console.error('Error creating invoice:', error)
      res.status(500).json({ error: 'Failed to create invoice', details: error.message })
    }
  }

  static async getInvoices(req, res) {
    const db = req.app.locals.db
    const { delivery_note_id, status } = req.query

    try {
      let query = `SELECT si.*, sdn.delivery_note_id, sdn.sales_order_id, sc.name as customer_name
                   FROM selling_invoice si
                   LEFT JOIN selling_delivery_note sdn ON si.delivery_note_id = sdn.delivery_note_id
                   LEFT JOIN selling_sales_order sso ON sdn.sales_order_id = sso.sales_order_id
                   LEFT JOIN selling_customer sc ON sso.customer_id = sc.customer_id
                   WHERE si.deleted_at IS NULL`
      const params = []

      if (delivery_note_id) {
        query += ' AND si.delivery_note_id = ?'
        params.push(delivery_note_id)
      }
      if (status) {
        query += ' AND si.status = ?'
        params.push(status)
      }

      query += ' ORDER BY si.created_at DESC'

      const [invoices] = await db.execute(query, params)
      res.json({ success: true, data: invoices })
    } catch (error) {
      console.error('Error fetching invoices:', error)
      res.status(500).json({ error: 'Failed to fetch invoices', details: error.message })
    }
  }

  // ============================================
  // INVOICE MANAGEMENT
  // ============================================

  static async submitInvoice(req, res) {
    const db = req.app.locals.db
    const { id } = req.params
    const { status } = req.body || {}

    try {
      // Check if invoice exists
      const [invoices] = await db.execute(
        'SELECT invoice_id, status FROM selling_invoice WHERE invoice_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!invoices.length) {
        return res.status(404).json({ error: 'Invoice not found' })
      }

      // Update status to issued
      const newStatus = status || 'issued'
      await db.execute(
        'UPDATE selling_invoice SET status = ?, updated_at = NOW() WHERE invoice_id = ?',
        [newStatus, id]
      )

      // Fetch updated invoice
      const [updated] = await db.execute(
        `SELECT si.*, sdn.delivery_note_id, sso.sales_order_id, sc.name as customer_name 
         FROM selling_invoice si
         LEFT JOIN selling_delivery_note sdn ON si.delivery_note_id = sdn.delivery_note_id
         LEFT JOIN selling_sales_order sso ON sdn.sales_order_id = sso.sales_order_id
         LEFT JOIN selling_customer sc ON sso.customer_id = sc.customer_id
         WHERE si.invoice_id = ?`,
        [id]
      )

      res.json({ success: true, data: updated[0] })
    } catch (error) {
      console.error('Error submitting invoice:', error)
      res.status(500).json({ error: 'Failed to submit invoice', details: error.message })
    }
  }

  static async deleteInvoice(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      // Check if invoice exists
      const [invoices] = await db.execute(
        'SELECT invoice_id FROM selling_invoice WHERE invoice_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!invoices.length) {
        return res.status(404).json({ error: 'Invoice not found' })
      }

      // Soft delete
      await db.execute(
        'UPDATE selling_invoice SET deleted_at = NOW(), updated_at = NOW() WHERE invoice_id = ?',
        [id]
      )

      res.json({ success: true, message: 'Invoice deleted successfully' })
    } catch (error) {
      console.error('Error deleting invoice:', error)
      res.status(500).json({ error: 'Failed to delete invoice', details: error.message })
    }
  }

  // ============================================
  // DELIVERY NOTE MANAGEMENT
  // ============================================

  static async submitDeliveryNote(req, res) {
    const db = req.app.locals.db
    const { id } = req.params
    const { status } = req.body || {}

    try {
      // Check if delivery note exists
      const [notes] = await db.execute(
        'SELECT delivery_note_id, status FROM selling_delivery_note WHERE delivery_note_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!notes.length) {
        return res.status(404).json({ error: 'Delivery note not found' })
      }

      // Update status to delivered
      const newStatus = status || 'delivered'
      await db.execute(
        'UPDATE selling_delivery_note SET status = ?, updated_at = NOW() WHERE delivery_note_id = ?',
        [newStatus, id]
      )

      // Fetch updated delivery note
      const [updated] = await db.execute(
        `SELECT sdn.*, so.order_amount, sc.name as customer_name 
         FROM selling_delivery_note sdn
         LEFT JOIN selling_sales_order so ON sdn.sales_order_id = so.sales_order_id
         LEFT JOIN selling_customer sc ON so.customer_id = sc.customer_id
         WHERE sdn.delivery_note_id = ?`,
        [id]
      )

      res.json({ success: true, data: updated[0] })
    } catch (error) {
      console.error('Error submitting delivery note:', error)
      res.status(500).json({ error: 'Failed to submit delivery note', details: error.message })
    }
  }

  static async deleteDeliveryNote(req, res) {
    const db = req.app.locals.db
    const { id } = req.params

    try {
      // Check if delivery note exists
      const [notes] = await db.execute(
        'SELECT delivery_note_id FROM selling_delivery_note WHERE delivery_note_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!notes.length) {
        return res.status(404).json({ error: 'Delivery note not found' })
      }

      // Soft delete
      await db.execute(
        'UPDATE selling_delivery_note SET deleted_at = NOW(), updated_at = NOW() WHERE delivery_note_id = ?',
        [id]
      )

      res.json({ success: true, message: 'Delivery note deleted successfully' })
    } catch (error) {
      console.error('Error deleting delivery note:', error)
      res.status(500).json({ error: 'Failed to delete delivery note', details: error.message })
    }
  }
}

// Helper function for email validation
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}