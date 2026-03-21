import { CustomerModel } from '../models/CustomerModel.js'

export class CustomerController {
  static async getAll(req, res) {
    try {
      const { db } = req.app.locals
      const { search, status } = req.query

      const model = new CustomerModel(db)
      const filters = {
        limit: 1000,
        offset: 0
      }

      if (search) {
        filters.name = search
      }

      if (status) {
        filters.status = status
      }

      const customers = await model.getAll(filters)

      const mappedCustomers = customers.map(c => ({
        customer_id: c.customer_id,
        customer_name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        address: c.billing_address || '',
        billing_address: c.billing_address || '',
        shipping_address: c.shipping_address || '',
        gstin: c.gstin || '',
        credit_limit: c.credit_limit || 0,
        customer_type: c.customer_type || 'other',
        status: c.status || 'active'
      }))

      res.json({ success: true, data: mappedCustomers })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async getById(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const model = new CustomerModel(db)
      const customer = await model.getById(id)

      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' })
      }

      const mapped = {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        billing_address: customer.billing_address || '',
        shipping_address: customer.shipping_address || '',
        gstin: customer.gstin || '',
        credit_limit: customer.credit_limit || 0,
        customer_type: customer.customer_type || 'other',
        status: customer.status || 'active'
      }

      res.json({ success: true, data: mapped })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async create(req, res) {
    try {
      const { db } = req.app.locals
      const {
        customer_id,
        customer_name,
        customer_type,
        email,
        phone,
        billing_address,
        shipping_address,
        gstin,
        credit_limit,
        status
      } = req.body

      if (!customer_id || !customer_name) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID and name are required'
        })
      }

      const model = new CustomerModel(db)
      const data = {
        customer_id,
        name: customer_name,
        customer_type: customer_type || 'other',
        email: email || null,
        phone: phone || null,
        billing_address: billing_address || null,
        shipping_address: shipping_address || null,
        gstin: gstin || null,
        credit_limit: credit_limit || 0,
        status: status || 'active'
      }

      const customer = await model.create(data)

      const mapped = {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        billing_address: customer.billing_address || '',
        shipping_address: customer.shipping_address || '',
        gstin: customer.gstin || '',
        credit_limit: customer.credit_limit || 0,
        customer_type: customer.customer_type || 'other',
        status: customer.status || 'active'
      }

      res.status(201).json({ success: true, data: mapped })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async update(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const {
        customer_name,
        customer_type,
        email,
        phone,
        billing_address,
        shipping_address,
        gstin,
        credit_limit,
        status
      } = req.body

      const model = new CustomerModel(db)
      const existing = await model.getById(id)

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Customer not found' })
      }

      const updateData = {}
      if (customer_name) updateData.name = customer_name
      if (customer_type !== undefined) updateData.customer_type = customer_type || 'other'
      if (email !== undefined) updateData.email = email || null
      if (phone !== undefined) updateData.phone = phone || null
      if (billing_address !== undefined) updateData.billing_address = billing_address || null
      if (shipping_address !== undefined) updateData.shipping_address = shipping_address || null
      if (gstin !== undefined) updateData.gstin = gstin || null
      if (credit_limit !== undefined) updateData.credit_limit = credit_limit || 0
      if (status !== undefined) updateData.status = status || 'active'

      const customer = await model.update(id, updateData)

      const mapped = {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        billing_address: customer.billing_address || '',
        shipping_address: customer.shipping_address || '',
        gstin: customer.gstin || '',
        credit_limit: customer.credit_limit || 0,
        customer_type: customer.customer_type || 'other',
        status: customer.status || 'active'
      }

      res.json({ success: true, data: mapped })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async delete(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const model = new CustomerModel(db)
      const customer = await model.getById(id)

      if (!customer) {
        return res.status(404).json({ success: false, error: 'Customer not found' })
      }

      await model.delete(id)
      res.json({ success: true, message: 'Customer deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}
