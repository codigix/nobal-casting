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
        filters.is_active = status === 'active' ? 1 : status === 'inactive' ? 0 : undefined
      }

      const customers = await model.getAll(filters)

      const mappedCustomers = customers.map(c => ({
        customer_id: c.customer_id,
        customer_name: c.name,
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        postal_code: c.postal_code || '',
        country: c.country || '',
        customer_type: c.customer_type || 'other',
        status: c.is_active ? 'active' : 'inactive'
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
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        country: customer.country || '',
        customer_type: customer.customer_type || 'other',
        status: customer.is_active ? 'active' : 'inactive'
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
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        customer_type,
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
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postal_code: postal_code || null,
        country: country || null,
        customer_type: customer_type || 'other',
        is_active: status === 'active' ? 1 : 0
      }

      const customer = await model.create(data)

      const mapped = {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        country: customer.country || '',
        customer_type: customer.customer_type || 'other',
        status: customer.is_active ? 'active' : 'inactive'
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
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        customer_type,
        status
      } = req.body

      const model = new CustomerModel(db)
      const existing = await model.getById(id)

      if (!existing) {
        return res.status(404).json({ success: false, error: 'Customer not found' })
      }

      const updateData = {}
      if (customer_name) updateData.name = customer_name
      if (email !== undefined) updateData.email = email || null
      if (phone !== undefined) updateData.phone = phone || null
      if (address !== undefined) updateData.address = address || null
      if (city !== undefined) updateData.city = city || null
      if (state !== undefined) updateData.state = state || null
      if (postal_code !== undefined) updateData.postal_code = postal_code || null
      if (country !== undefined) updateData.country = country || null
      if (customer_type !== undefined) updateData.customer_type = customer_type || 'other'
      if (status !== undefined) updateData.is_active = status === 'active' ? 1 : 0

      const customer = await model.update(id, updateData)

      const mapped = {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        country: customer.country || '',
        customer_type: customer.customer_type || 'other',
        status: customer.is_active ? 'active' : 'inactive'
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
