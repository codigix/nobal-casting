export class SellingController {
  // ============================================
  // CUSTOMER ENDPOINTS
  // ============================================

  static async createCustomer(req, res) {
    const db = req.app.locals.db
    const { customer_id, name, email, phone, gstin, gst_no, billing_address, shipping_address, credit_limit, status } = req.body

    try {
      // Validation
      if (!name) {
        return res.status(400).json({ error: 'Customer name is required' })
      }

      if (email && !isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }

      const finalCustomerId = customer_id || `CUST-${Date.now()}`
      const gstinValue = gstin || gst_no

      await db.execute(
        `INSERT INTO selling_customer 
         (customer_id, name, email, phone, gstin, billing_address, shipping_address, credit_limit, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalCustomerId,
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
          customer_id: finalCustomerId,
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
      let query = 'SELECT customer_id, name, email, phone FROM selling_customer WHERE deleted_at IS NULL'
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

      console.log('🔍 Executing query:', query)
      const [customers] = await db.execute(query, params)
      console.log('📊 Found customers:', customers.length)
      console.log('Raw data:', JSON.stringify(customers, null, 2))
      
      const mappedCustomers = customers.map(c => ({
        customer_id: c.customer_id,
        customer_name: c.name,
        email: c.email || '',
        phone: c.phone || ''
      }))
      
      console.log('Mapped customers:', JSON.stringify(mappedCustomers, null, 2))
      res.json({ success: true, data: mappedCustomers })
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

  static async truncateCustomers(req, res) {
    const db = req.app.locals.db

    try {
      await db.execute('SET FOREIGN_KEY_CHECKS = 0')
      await db.execute('TRUNCATE TABLE selling_customer')
      await db.execute('SET FOREIGN_KEY_CHECKS = 1')
      res.json({ success: true, message: 'All customers truncated successfully' })
    } catch (error) {
      console.error('Error truncating customers:', error)
      res.status(500).json({ error: 'Failed to truncate customers', details: error.message })
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
        'SELECT customer_id FROM customer WHERE customer_id = ? AND deleted_at IS NULL',
        [customer_id]
      )

      if (!customerCheck.length) {
        return res.status(400).json({ error: 'Customer not found. Please select a valid customer.' })
      }

      const quotation_id = `QT-${Date.now()}`

      // Disable FK checks temporarily to allow inserts
      await db.execute('SET FOREIGN_KEY_CHECKS = 0')

      await db.execute(
        `INSERT INTO selling_quotation 
         (quotation_id, customer_id, amount, validity_date, notes, status)
         VALUES (?, ?, ?, ?, ?, 'draft')`,
        [quotation_id, customer_id, finalAmount, finalDate || null, notes || null]
      )
      
      // Re-enable FK checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 1')

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

  static isSubAssemblyType(itemType) {
    if (!itemType) return false
    const normalized = String(itemType).toLowerCase().replace(/[-\s]/g, '').trim()
    return normalized === 'subassemblies' || normalized === 'subassembly'
  }

  static async checkDuplicateSalesOrder(db, items, excludeOrderId = null) {
    try {
      if (!items || items.length === 0) return null

      const [existingOrders] = await db.execute(
        'SELECT sales_order_id, items, bom_finished_goods FROM selling_sales_order WHERE deleted_at IS NULL'
      )

      if (!existingOrders.length) return null

      const incomingItemCodes = new Set()
      const incomingItemTypes = new Map()
      
      items.forEach(item => {
        incomingItemCodes.add(item.item_code)
        incomingItemTypes.set(item.item_code, item.fg_sub_assembly)
      })

      for (const order of existingOrders) {
        if (excludeOrderId && order.sales_order_id === excludeOrderId) {
          continue
        }
        
        const existingItems = order.items ? JSON.parse(order.items) : []
        const existingBomItems = order.bom_finished_goods ? JSON.parse(order.bom_finished_goods) : []
        
        const allExistingItems = [...existingItems, ...existingBomItems]
        
        for (const existingItem of allExistingItems) {
          if (incomingItemCodes.has(existingItem.item_code || existingItem.component_code)) {
            const incomingType = incomingItemTypes.get(existingItem.item_code || existingItem.component_code)
            const existingType = existingItem.fg_sub_assembly || existingItem.component_type
            
            if (incomingType === 'FG' && SellingController.isSubAssemblyType(existingType)) {
              return {
                order_id: order.sales_order_id,
                conflict: `Finished Good item is already in use as sub-assembly in sales order ${order.sales_order_id}`
              }
            }
            
            if (SellingController.isSubAssemblyType(incomingType) && existingType === 'FG') {
              return {
                order_id: order.sales_order_id,
                conflict: `Sub-Assembly item is already in use as finished good in sales order ${order.sales_order_id}`
              }
            }
          }
        }
      }

      return null
    } catch (err) {
      console.error('Error checking duplicate sales orders:', err)
      return null
    }
  }

  static async createSalesOrder(req, res) {
    const db = req.app.locals.db
    const { customer_id, customer_name, customer_email, customer_phone, quotation_id, order_amount, total_value, delivery_date, order_terms, terms_conditions, items, bom_id, bom_name, source_warehouse, order_type, status, quantity, qty, bom_raw_materials, bom_operations, bom_finished_goods, profit_margin_percentage, cgst_rate, sgst_rate } = req.body

    try {
      // Accept both field name variations
      const finalTerms = order_terms || terms_conditions
      const salesQuantity = parseFloat(qty || quantity) || 1

      if (!customer_id) {
        return res.status(400).json({ error: 'Customer is required' })
      }

      if (!bom_id) {
        return res.status(400).json({ error: 'BOM must be selected. Sales Order must always link to a Finished Goods BOM.' })
      }

      const [bomRows] = await db.execute(
        'SELECT bom_id FROM bom WHERE bom_id = ?',
        [bom_id]
      )

      if (!bomRows.length) {
        return res.status(400).json({ error: 'Selected BOM not found.' })
      }

      // Fetch customer details
      const [customerRows] = await db.execute(
        'SELECT customer_id, name, email, phone FROM customer WHERE customer_id = ? AND deleted_at IS NULL',
        [customer_id]
      )

      if (!customerRows.length) {
        return res.status(400).json({ error: 'Customer not found. Please select a valid customer.' })
      }

      const customer = customerRows[0]
      const finalCustomerName = customer_name || customer.name || ''
      const finalCustomerEmail = customer_email || customer.email || ''
      const finalCustomerPhone = customer_phone || customer.phone || ''

      const duplicateCheck = await SellingController.checkDuplicateSalesOrder(db, items)
      if (duplicateCheck) {
        return res.status(409).json({ error: duplicateCheck.conflict })
      }

      const sales_order_id = `SO-${Date.now()}`
      
      // Calculate amounts for items based on BOM qty and sales order quantity
      const calculatedItems = items && items.length > 0 
        ? items.map(item => ({
            ...item,
            amount: ((item.bom_qty || item.qty || 1) * salesQuantity * (item.rate || 0))
          }))
        : []
      
      // Calculate grand total
      const finalAmount = calculatedItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      
      const itemsJSON = calculatedItems && calculatedItems.length > 0 ? JSON.stringify(calculatedItems) : null
      const bomRawMaterialsJSON = bom_raw_materials ? JSON.stringify(bom_raw_materials) : null
      const bomOperationsJSON = bom_operations ? JSON.stringify(bom_operations) : null
      const bomFinishedGoodsJSON = bom_finished_goods ? JSON.stringify(bom_finished_goods) : null

      // Disable FK checks temporarily to allow inserts
      await db.execute('SET FOREIGN_KEY_CHECKS = 0')
      
      await db.execute(
        `INSERT INTO selling_sales_order 
         (sales_order_id, customer_id, customer_name, customer_email, customer_phone, quotation_id, order_amount, profit_margin_percentage, cgst_rate, sgst_rate, delivery_date, order_terms, items, bom_id, bom_name, qty, source_warehouse, order_type, status, bom_raw_materials, bom_operations, bom_finished_goods)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sales_order_id, customer_id, finalCustomerName, finalCustomerEmail, finalCustomerPhone, quotation_id || null, finalAmount, profit_margin_percentage || 0, cgst_rate || 0, sgst_rate || 0, delivery_date || null, finalTerms || null, itemsJSON, bom_id || null, bom_name || null, salesQuantity, source_warehouse || null, order_type || 'Sales', status || 'Draft', bomRawMaterialsJSON, bomOperationsJSON, bomFinishedGoodsJSON]
      )
      
      // Re-enable FK checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 1')

      res.status(201).json({
        success: true,
        data: {
          sales_order_id,
          customer_id,
          customer_name: finalCustomerName,
          customer_email: finalCustomerEmail,
          customer_phone: finalCustomerPhone,
          quotation_id,
          order_amount: finalAmount,
          total_value: finalAmount,
          delivery_date,
          order_terms: finalTerms,
          items: items || [],
          bom_id,
          bom_name,
          qty: salesQuantity,
          source_warehouse,
          order_type: order_type || 'Sales',
          status: status || 'Draft',
          bom_raw_materials: bom_raw_materials || [],
          bom_operations: bom_operations || [],
          bom_finished_goods: bom_finished_goods || []
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
      let query = `SELECT sso.sales_order_id, sso.customer_id, sso.quotation_id, sso.order_amount, sso.profit_margin_percentage, sso.cgst_rate, sso.sgst_rate, sso.delivery_date, sso.order_terms, sso.status, sso.created_by, sso.updated_by, sso.created_at, sso.updated_at, sso.confirmed_at, sso.deleted_at, sso.items, sso.bom_id, sso.bom_name, sso.qty, sso.source_warehouse, sso.order_type, sso.customer_name, sso.customer_email, sso.customer_phone, sso.bom_finished_goods, sso.bom_raw_materials, sso.bom_operations,
                          sso.order_amount as total_value, 
                          COALESCE(c.name, sso.customer_name, '') as customer_full_name,
                          COALESCE(c.email, sso.customer_email, '') as customer_email_alt,
                          COALESCE(c.phone, sso.customer_phone, '') as customer_phone_alt
                   FROM selling_sales_order sso
                   LEFT JOIN selling_customer c ON sso.customer_id = c.customer_id
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
      
      const processedOrders = orders.map(order => ({
        ...order,
        customer_name: order.customer_name || order.customer_full_name,
        customer_email: order.customer_email || order.customer_email_alt,
        customer_phone: order.customer_phone || order.customer_phone_alt,
        items: order.items ? JSON.parse(order.items) : [],
        bom_finished_goods: order.bom_finished_goods ? JSON.parse(order.bom_finished_goods) : [],
        bom_raw_materials: order.bom_raw_materials ? JSON.parse(order.bom_raw_materials) : [],
        bom_operations: order.bom_operations ? JSON.parse(order.bom_operations) : []
      }))
      
      res.json({ success: true, data: processedOrders })
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
        `SELECT sso.sales_order_id, sso.customer_id, sso.quotation_id, sso.order_amount, sso.profit_margin_percentage, sso.cgst_rate, sso.sgst_rate, sso.delivery_date, sso.order_terms, sso.status, sso.created_by, sso.updated_by, sso.created_at, sso.updated_at, sso.confirmed_at, sso.deleted_at, sso.items, sso.bom_id, sso.bom_name, sso.qty, sso.source_warehouse, sso.order_type, sso.bom_finished_goods, sso.bom_raw_materials, sso.bom_operations,
                sso.order_amount as total_value, 
                COALESCE(c.name, '') as customer_name,
                COALESCE(c.email, '') as customer_email,
                COALESCE(c.phone, '') as customer_phone
         FROM selling_sales_order sso
         LEFT JOIN selling_customer c ON sso.customer_id = c.customer_id
         WHERE sso.sales_order_id = ?`,
        [id]
      )

      const processedOrder = {
        ...updated[0],
        items: updated[0].items ? JSON.parse(updated[0].items) : [],
        bom_finished_goods: updated[0].bom_finished_goods ? JSON.parse(updated[0].bom_finished_goods) : [],
        bom_raw_materials: updated[0].bom_raw_materials ? JSON.parse(updated[0].bom_raw_materials) : [],
        bom_operations: updated[0].bom_operations ? JSON.parse(updated[0].bom_operations) : []
      }

      res.json({ success: true, data: processedOrder })
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
        `SELECT sso.sales_order_id, sso.customer_id, sso.quotation_id, sso.order_amount, sso.profit_margin_percentage, sso.cgst_rate, sso.sgst_rate, sso.delivery_date, sso.order_terms, sso.status, sso.created_by, sso.updated_by, sso.created_at, sso.updated_at, sso.confirmed_at, sso.deleted_at, sso.items, sso.bom_id, sso.bom_name, sso.qty, sso.source_warehouse, sso.order_type, sso.bom_finished_goods, sso.bom_raw_materials, sso.bom_operations,
                sso.order_amount as total_value,
                sso.customer_name,
                sso.customer_email,
                sso.customer_phone,
                COALESCE(c.name, sso.customer_name, '') as customer_full_name,
                COALESCE(c.email, sso.customer_email, '') as customer_email_alt,
                COALESCE(c.phone, sso.customer_phone, '') as customer_phone_alt
         FROM selling_sales_order sso
         LEFT JOIN selling_customer c ON sso.customer_id = c.customer_id
         WHERE sso.sales_order_id = ? AND sso.deleted_at IS NULL`,
        [id]
      )

      if (!orders.length) {
        return res.status(404).json({ error: 'Sales order not found' })
      }

      const order = orders[0]
      const processedOrder = {
        ...order,
        customer_name: order.customer_name || order.customer_full_name,
        customer_email: order.customer_email || order.customer_email_alt,
        customer_phone: order.customer_phone || order.customer_phone_alt,
        items: order.items ? JSON.parse(order.items) : [],
        bom_finished_goods: order.bom_finished_goods ? JSON.parse(order.bom_finished_goods) : [],
        bom_raw_materials: order.bom_raw_materials ? JSON.parse(order.bom_raw_materials) : [],
        bom_operations: order.bom_operations ? JSON.parse(order.bom_operations) : []
      }

      res.json({ success: true, data: processedOrder })
    } catch (error) {
      console.error('Error fetching sales order:', error)
      res.status(500).json({ error: 'Failed to fetch sales order', details: error.message })
    }
  }

  static async getSalesOrderByItem(req, res) {
    const db = req.app.locals.db
    const { item_code } = req.params

    try {
      if (!item_code) {
        return res.status(400).json({ error: 'Item code is required' })
      }

      const [orders] = await db.execute(
        `SELECT sso.sales_order_id, sso.customer_id, sso.order_amount, sso.delivery_date, sso.status, sso.items, sso.bom_id, sso.bom_name, sso.customer_name, sso.customer_email, sso.customer_phone, c.name, c.email, c.phone
         FROM selling_sales_order sso
         LEFT JOIN selling_customer c ON sso.customer_id = c.customer_id
         WHERE sso.deleted_at IS NULL AND sso.status != 'cancelled'`,
        []
      )

      let matchingOrders = []
      
      for (const order of orders) {
        let items = []
        try {
            items = order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : []
        } catch (e) {
            continue
        }

        const hasItem = Array.isArray(items) && items.some(item => 
            item.item_code && item.item_code.toString().trim().toLowerCase() === item_code.toString().trim().toLowerCase()
        )
        if (hasItem) {
          matchingOrders.push({
            sales_order_id: order.sales_order_id,
            customer_id: order.customer_id,
            customer_name: order.customer_name || order.name,
            customer_email: order.customer_email || order.email,
            customer_phone: order.customer_phone || order.phone,
            bom_id: order.bom_id,
            bom_name: order.bom_name,
            status: order.status,
            order_amount: order.order_amount,
            delivery_date: order.delivery_date
          })
        }
      }

      if (matchingOrders.length === 0) {
        return res.json({ success: true, data: null, message: 'No sales order found for this item' })
      }

      res.json({ success: true, data: matchingOrders[0], allOrders: matchingOrders })
    } catch (error) {
      console.error('Error fetching sales order by item:', error)
      res.status(500).json({ error: 'Failed to fetch sales order by item', details: error.message })
    }
  }

  static async updateSalesOrder(req, res) {
    const db = req.app.locals.db
    const { id } = req.params
    const { order_amount, total_value, delivery_date, order_terms, status, items, bom_id, bom_name, source_warehouse, order_type, customer_name, customer_email, customer_phone, bom_raw_materials, bom_operations, bom_finished_goods, qty, profit_margin_percentage, cgst_rate, sgst_rate } = req.body

    try {
      // Check if order exists
      const [orderCheck] = await db.execute(
        'SELECT sales_order_id FROM selling_sales_order WHERE sales_order_id = ? AND deleted_at IS NULL',
        [id]
      )

      if (!orderCheck.length) {
        return res.status(404).json({ error: 'Sales order not found' })
      }

      if (items !== undefined) {
        const duplicateCheck = await SellingController.checkDuplicateSalesOrder(db, items, id)
        if (duplicateCheck) {
          return res.status(409).json({ error: duplicateCheck.conflict })
        }
      }

      // Build update query dynamically
      const updates = []
      const values = []

      // Calculate amounts for items and grand total if items are provided
      let calculatedItems = null
      let finalAmount = order_amount || total_value
      
      if (items !== undefined) {
        calculatedItems = items && items.length > 0
          ? items.map(item => ({
              ...item,
              amount: ((item.bom_qty || item.qty || 1) * (item.rate || 0))
            }))
          : []
        
        // Calculate grand total from items
        finalAmount = calculatedItems.reduce((sum, item) => sum + (item.amount || 0), 0)
        
        updates.push('items = ?')
        values.push(calculatedItems && calculatedItems.length > 0 ? JSON.stringify(calculatedItems) : null)
      }

      if (order_amount !== undefined || total_value !== undefined) {
        updates.push('order_amount = ?')
        values.push(finalAmount)
      }
      if (bom_id !== undefined) {
        updates.push('bom_id = ?')
        values.push(bom_id || null)
      }
      if (bom_name !== undefined) {
        updates.push('bom_name = ?')
        values.push(bom_name || null)
      }
      if (qty !== undefined) {
        updates.push('qty = ?')
        values.push(parseFloat(qty) || 1)
      }
      if (source_warehouse !== undefined) {
        updates.push('source_warehouse = ?')
        values.push(source_warehouse || null)
      }
      if (order_type !== undefined) {
        updates.push('order_type = ?')
        values.push(order_type || null)
      }
      if (customer_name !== undefined) {
        updates.push('customer_name = ?')
        values.push(customer_name || null)
      }
      if (customer_email !== undefined) {
        updates.push('customer_email = ?')
        values.push(customer_email || null)
      }
      if (customer_phone !== undefined) {
        updates.push('customer_phone = ?')
        values.push(customer_phone || null)
      }
      if (bom_raw_materials !== undefined) {
        updates.push('bom_raw_materials = ?')
        values.push(bom_raw_materials ? JSON.stringify(bom_raw_materials) : null)
      }
      if (bom_operations !== undefined) {
        updates.push('bom_operations = ?')
        values.push(bom_operations ? JSON.stringify(bom_operations) : null)
      }
      if (bom_finished_goods !== undefined) {
        updates.push('bom_finished_goods = ?')
        values.push(bom_finished_goods ? JSON.stringify(bom_finished_goods) : null)
      }
      if (profit_margin_percentage !== undefined) {
        updates.push('profit_margin_percentage = ?')
        values.push(profit_margin_percentage || 0)
      }
      if (cgst_rate !== undefined) {
        updates.push('cgst_rate = ?')
        values.push(cgst_rate || 0)
      }
      if (sgst_rate !== undefined) {
        updates.push('sgst_rate = ?')
        values.push(sgst_rate || 0)
      }
      if (status !== undefined) {
        updates.push('status = ?')
        values.push(status || 'Draft')
      }
      if (delivery_date !== undefined) {
        updates.push('delivery_date = ?')
        const dateValue = delivery_date ? new Date(delivery_date).toISOString().split('T')[0] : null
        values.push(dateValue)
      }
      if (order_terms !== undefined) {
        updates.push('order_terms = ?')
        values.push(order_terms || null)
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }

      updates.push('updated_at = NOW()')
      values.push(id)

      const query = `UPDATE selling_sales_order SET ${updates.join(', ')} WHERE sales_order_id = ?`
      console.log('UPDATE Query:', query)
      console.log('UPDATE Values:', values)
      const result = await db.execute(query, values)
      console.log('UPDATE executed successfully', result)

      // Fetch updated order with customer info
      const [updated] = await db.execute(
        `SELECT sso.sales_order_id, sso.customer_id, sso.quotation_id, sso.order_amount, sso.delivery_date, sso.order_terms, sso.status, sso.created_by, sso.updated_by, sso.created_at, sso.updated_at, sso.confirmed_at, sso.deleted_at, sso.items, sso.bom_id, sso.bom_name, sso.qty, sso.source_warehouse, sso.order_type, sso.bom_finished_goods, sso.bom_raw_materials, sso.bom_operations,
                sso.order_amount as total_value, 
                COALESCE(c.name, '') as customer_name,
                COALESCE(c.email, '') as customer_email,
                COALESCE(c.phone, '') as customer_phone
         FROM selling_sales_order sso
         LEFT JOIN selling_customer c ON sso.customer_id = c.customer_id
         WHERE sso.sales_order_id = ?`,
        [id]
      )

      const processedOrder = {
        ...updated[0],
        items: updated[0].items ? JSON.parse(updated[0].items) : [],
        bom_finished_goods: updated[0].bom_finished_goods ? JSON.parse(updated[0].bom_finished_goods) : [],
        bom_raw_materials: updated[0].bom_raw_materials ? JSON.parse(updated[0].bom_raw_materials) : [],
        bom_operations: updated[0].bom_operations ? JSON.parse(updated[0].bom_operations) : []
      }

      res.json({ success: true, data: processedOrder })
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

  static async truncateSalesOrders(req, res) {
    const db = req.app.locals.db

    try {
      await db.execute(
        'DELETE FROM selling_sales_order'
      )

      res.json({ success: true, message: 'All sales orders truncated successfully' })
    } catch (error) {
      console.error('Error truncating sales orders:', error)
      res.status(500).json({ error: 'Failed to truncate sales orders', details: error.message })
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
