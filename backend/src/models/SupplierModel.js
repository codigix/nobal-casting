export class SupplierModel {
  /**
   * Get all suppliers (both active and inactive)
   */
  static async getAll(db) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM supplier ORDER BY name'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch suppliers: ' + error.message)
    }
  }

  /**
   * Get only active suppliers
   */
  static async getActive(db) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM supplier WHERE is_active = true ORDER BY name'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch active suppliers: ' + error.message)
    }
  }

  /**
   * Get supplier by ID with complete details
   */
  static async getById(db, supplierId) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM supplier WHERE supplier_id = ?',
        [supplierId]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error('Failed to fetch supplier: ' + error.message)
    }
  }

  /**
   * Get supplier by name (case-insensitive)
   */
  static async getByName(db, name) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM supplier WHERE name = ? COLLATE utf8mb4_general_ci',
        [name]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error('Failed to fetch supplier by name: ' + error.message)
    }
  }

  /**
   * Create new supplier
   */
  static async create(db, supplierData) {
    try {
      const {
        name,
        supplier_group,
        gstin,
        payment_terms_days = 30,
        lead_time_days = 7,
        rating = 0,
        is_active = true
      } = supplierData

      // Generate supplier ID
      const supplier_id = 'SUP-' + Date.now()

      // Handle supplier_group - can be either group name or ID
      let supplier_group_id = null
      if (supplier_group) {
        if (typeof supplier_group === 'number') {
          supplier_group_id = supplier_group
        } else if (typeof supplier_group === 'string') {
          // If it's a string, try to look up the group by name
          const [groups] = await db.execute(
            'SELECT id FROM supplier_group WHERE name = ? LIMIT 1',
            [supplier_group]
          )
          supplier_group_id = groups.length > 0 ? groups[0].id : null
        }
      }

      const [result] = await db.execute(
        'INSERT INTO supplier (supplier_id, name, supplier_group_id, gstin, payment_terms_days, lead_time_days, rating, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [supplier_id, name, supplier_group_id, gstin, payment_terms_days, lead_time_days, rating, is_active]
      )

      return { supplier_id, name, supplier_group_id, gstin, payment_terms_days, lead_time_days, rating, is_active }
    } catch (error) {
      throw new Error('Failed to create supplier: ' + error.message)
    }
  }

  /**
   * Update supplier
   */
  static async update(db, supplierId, supplierData) {
    try {
      const validColumns = [
        'name',
        'supplier_group_id',
        'gstin',
        'contact_person_id',
        'address_id',
        'bank_details',
        'payment_terms_days',
        'lead_time_days',
        'rating',
        'is_active'
      ]

      // Filter out empty values, supplier_id, and invalid columns
      const updateData = Object.entries(supplierData)
        .filter(([key, value]) => 
          validColumns.includes(key) && 
          value !== undefined && 
          value !== null && 
          value !== ''
        )
        .reduce((acc, [key, value]) => {
          acc[key] = value
          return acc
        }, {})

      if (Object.keys(updateData).length === 0) {
        return await this.getById(db, supplierId)
      }

      // Handle supplier_group conversion
      if (updateData.supplier_group_id === undefined && supplierData.supplier_group) {
        const groupValue = supplierData.supplier_group
        let supplier_group_id = null
        
        if (typeof groupValue === 'number') {
          supplier_group_id = groupValue
        } else if (typeof groupValue === 'string') {
          const [groups] = await db.execute(
            'SELECT id FROM supplier_group WHERE name = ? LIMIT 1',
            [groupValue]
          )
          supplier_group_id = groups.length > 0 ? groups[0].id : null
        }
        
        updateData.supplier_group_id = supplier_group_id
      }

      const fields = Object.keys(updateData)
        .map(key => `${key} = ?`)
        .join(', ')
      const values = [...Object.values(updateData), supplierId]

      await db.execute(
        `UPDATE supplier SET ${fields} WHERE supplier_id = ?`,
        values
      )

      return await this.getById(db, supplierId)
    } catch (error) {
      throw new Error('Failed to update supplier: ' + error.message)
    }
  }

  /**
   * Soft delete or deactivate supplier
   */
  static async deactivate(db, supplierId) {
    try {
      await db.execute('UPDATE supplier SET is_active = false WHERE supplier_id = ?', [supplierId])
      return true
    } catch (error) {
      throw new Error('Failed to deactivate supplier: ' + error.message)
    }
  }

  /**
   * Hard delete supplier
   */
  static async delete(db, supplierId) {
    try {
      await db.execute('DELETE FROM supplier WHERE supplier_id = ?', [supplierId])
      return true
    } catch (error) {
      throw new Error('Failed to delete supplier: ' + error.message)
    }
  }

  /**
   * Get supplier groups
   */
  static async getGroups(db) {
    try {
      const [rows] = await db.execute(
        'SELECT name, description FROM supplier_group ORDER BY name'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch supplier groups: ' + error.message)
    }
  }

  /**
   * Get suppliers by group
   */
  static async getByGroup(db, groupName) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM supplier WHERE supplier_group = ? AND is_active = true ORDER BY name',
        [groupName]
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch suppliers by group: ' + error.message)
    }
  }

  /**
   * Search suppliers with optional filters
   */
  static async search(db, searchTerm, filters = {}) {
    try {
      let query = 'SELECT * FROM supplier WHERE 1=1'
      const params = []

      if (searchTerm) {
        query += ' AND (name LIKE ? OR supplier_id LIKE ? OR gstin LIKE ?)'
        const term = `%${searchTerm}%`
        params.push(term, term, term)
      }

      if (filters.group) {
        query += ' AND supplier_group = ?'
        params.push(filters.group)
      }

      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?'
        params.push(filters.isActive)
      }

      if (filters.minRating !== undefined) {
        query += ' AND rating >= ?'
        params.push(filters.minRating)
      }

      query += ' ORDER BY name'

      const [rows] = await db.execute(query, params)
      return rows
    } catch (error) {
      throw new Error('Failed to search suppliers: ' + error.message)
    }
  }

  /**
   * Get supplier scorecard
   */
  static async getScorecardById(db, supplierId) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM supplier_scorecard WHERE supplier_id = ? ORDER BY last_evaluated_date DESC LIMIT 1',
        [supplierId]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error('Failed to fetch supplier scorecard: ' + error.message)
    }
  }

  /**
   * Get all contacts across all suppliers
   */
  static async getAllContacts(db) {
    try {
      const [rows] = await db.execute(
        'SELECT DISTINCT c.* FROM contact c ORDER BY c.name'
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch all contacts: ' + error.message)
    }
  }

  /**
   * Get supplier contacts
   */
  static async getContacts(db, supplierId) {
    try {
      const [rows] = await db.execute(
        'SELECT c.* FROM contact c INNER JOIN supplier_contact sc ON c.contact_id = sc.contact_id WHERE sc.supplier_id = ?',
        [supplierId]
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch supplier contacts: ' + error.message)
    }
  }

  /**
   * Get supplier addresses
   */
  static async getAddresses(db, supplierId) {
    try {
      const [rows] = await db.execute(
        'SELECT a.* FROM address a INNER JOIN supplier_address sa ON a.address_id = sa.address_id WHERE sa.supplier_id = ?',
        [supplierId]
      )
      return rows
    } catch (error) {
      throw new Error('Failed to fetch supplier addresses: ' + error.message)
    }
  }

  /**
   * Add contact to supplier
   */
  static async addContact(db, supplierId, contactId) {
    try {
      await db.execute(
        'INSERT INTO supplier_contact (supplier_id, contact_id) VALUES (?, ?)',
        [supplierId, contactId]
      )
      return true
    } catch (error) {
      throw new Error('Failed to add contact to supplier: ' + error.message)
    }
  }

  /**
   * Add address to supplier
   */
  static async addAddress(db, supplierId, addressId) {
    try {
      await db.execute(
        'INSERT INTO supplier_address (supplier_id, address_id) VALUES (?, ?)',
        [supplierId, addressId]
      )
      return true
    } catch (error) {
      throw new Error('Failed to add address to supplier: ' + error.message)
    }
  }

  /**
   * Get supplier statistics for analytics
   */
  static async getStatistics(db) {
    try {
      const [rows] = await db.execute(`
        SELECT 
          COUNT(*) as total_suppliers,
          SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_count,
          ROUND(AVG(rating), 2) as avg_rating,
          MAX(rating) as highest_rating
        FROM supplier
      `)
      return rows[0] || {}
    } catch (error) {
      throw new Error('Failed to fetch supplier statistics: ' + error.message)
    }
  }
}
