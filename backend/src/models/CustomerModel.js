export class CustomerModel {
  constructor(db) {
    this.db = db
  }

  async create(data) {
    const customer_id = data.customer_id || `CUST-${Date.now()}`

    try {
      await this.db.execute(
        `INSERT INTO selling_customer 
         (customer_id, name, customer_type, email, phone, gstin, billing_address, shipping_address, credit_limit, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_id,
          data.name,
          data.customer_type || 'other',
          data.email || null,
          data.phone || null,
          data.gstin || null,
          data.billing_address || null,
          data.shipping_address || null,
          data.credit_limit || 0,
          data.status || 'active',
          data.created_by || 'system'
        ]
      )

      return { customer_id, ...data }
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`)
    }
  }

  async getById(customerId) {
    try {
      const [rows] = await this.db.execute(
        `SELECT * FROM selling_customer WHERE customer_id = ? AND deleted_at IS NULL`,
        [customerId]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch customer: ${error.message}`)
    }
  }

  async getAll(filters) {
    try {
      let query = 'SELECT * FROM selling_customer WHERE deleted_at IS NULL'
      const params = []

      if (filters.name) {
        query += ' AND name LIKE ?'
        params.push(`%${filters.name}%`)
      }
      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }

      query += ' ORDER BY created_at DESC'
      query += ` LIMIT ${filters.limit || 50} OFFSET ${filters.offset || 0}`

      const [rows] = await this.db.execute(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`)
    }
  }

  async update(customerId, data) {
    try {
      const allowedFields = ['name', 'customer_type', 'email', 'phone', 'gstin', 'billing_address', 'shipping_address', 'credit_limit', 'status', 'updated_by']
      const updates = Object.keys(data)
        .filter(key => allowedFields.includes(key))
        .map(key => `${key} = ?`)
        .join(', ')

      const values = Object.keys(data)
        .filter(key => allowedFields.includes(key))
        .map(key => data[key])
      
      if (!updates) return { customer_id: customerId, ...data }
      
      values.push(customerId)

      await this.db.execute(
        `UPDATE selling_customer SET ${updates}, updated_at = NOW() WHERE customer_id = ? AND deleted_at IS NULL`,
        values
      )

      return { customer_id: customerId, ...data }
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`)
    }
  }

  async delete(customerId) {
    try {
      await this.db.execute(
        `UPDATE selling_customer SET deleted_at = NOW(), status = 'inactive' WHERE customer_id = ?`,
        [customerId]
      )
      return { message: 'Customer deleted successfully' }
    } catch (error) {
      throw new Error(`Failed to delete customer: ${error.message}`)
    }
  }

  async getScorecard(customerId) {
    try {
      const [rows] = await this.db.execute(
        `SELECT * FROM customer_scorecard WHERE customer_id = ?`,
        [customerId]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch scorecard: ${error.message}`)
    }
  }

  async getAllGroups() {
    try {
      const [rows] = await this.db.execute(
        `SELECT * FROM customer_group WHERE deleted_at IS NULL ORDER BY name`
      )
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch customer groups: ${error.message}`)
    }
  }

  async createGroup(groupData) {
    try {
      await this.db.execute(
        `INSERT INTO customer_group (name, description) VALUES (?, ?)`,
        [groupData.name, groupData.description || null]
      )
      return groupData
    } catch (error) {
      throw new Error(`Failed to create customer group: ${error.message}`)
    }
  }
}