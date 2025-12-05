import { v4 as uuidv4 } from 'uuid'

export class CustomerModel {
  constructor(db) {
    this.db = db
  }

  async create(data) {
    const customer_id = `CUST-${Date.now()}`

    try {
      await this.db.execute(
        `INSERT INTO customer 
         (customer_id, name, customer_group, gstin, contact_person_id, address_id, 
          billing_address_id, shipping_address_id, pan, credit_limit, payment_terms_days, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer_id,
          data.name,
          data.customer_group || null,
          data.gstin || null,
          data.contact_person_id || null,
          data.address_id || null,
          data.billing_address_id || null,
          data.shipping_address_id || null,
          data.pan || null,
          data.credit_limit || 0,
          data.payment_terms_days || 30,
          data.is_active !== undefined ? data.is_active : 1
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
        `SELECT * FROM customer WHERE customer_id = ? AND deleted_at IS NULL`,
        [customerId]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch customer: ${error.message}`)
    }
  }

  async getAll(filters) {
    try {
      let query = 'SELECT * FROM customer WHERE deleted_at IS NULL'
      const params = []

      if (filters.name) {
        query += ' AND name LIKE ?'
        params.push(`%${filters.name}%`)
      }
      if (filters.customer_group) {
        query += ' AND customer_group = ?'
        params.push(filters.customer_group)
      }
      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?'
        params.push(filters.is_active)
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
      const updates = Object.keys(data)
        .filter(key => key !== 'customer_id')
        .map(key => `${key} = ?`)
        .join(', ')

      const values = Object.values(data).filter((_, idx) => Object.keys(data)[idx] !== 'customer_id')
      values.push(customerId)

      if (!updates) return { customer_id: customerId, ...data }

      await this.db.execute(
        `UPDATE customer SET ${updates}, updated_at = NOW() WHERE customer_id = ? AND deleted_at IS NULL`,
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
        `UPDATE customer SET deleted_at = NOW() WHERE customer_id = ?`,
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