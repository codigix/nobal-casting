import { SupplierModel } from '../models/SupplierModel.js'

export class SupplierController {
  /**
   * GET /suppliers
   * Get all suppliers (with optional filters)
   */
  static async getAll(req, res) {
    try {
      const { db } = req.app.locals
      const { active, search, group } = req.query

      if (search || group || active !== undefined) {
        // Use search with filters
        const suppliers = await SupplierModel.search(db, search, {
          isActive: active === 'true',
          group: group || undefined
        })
        return res.json({ success: true, data: suppliers })
      }

      const suppliers = await SupplierModel.getAll(db)
      res.json({ success: true, data: suppliers })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/active
   * Get only active suppliers
   */
  static async getActive(req, res) {
    try {
      const { db } = req.app.locals
      const suppliers = await SupplierModel.getActive(db)
      res.json({ success: true, data: suppliers })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/:id
   * Get supplier by ID with complete details
   */
  static async getById(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const supplier = await SupplierModel.getById(db, id)

      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' })
      }

      // Get additional details
      const [contacts, addresses, scorecard] = await Promise.all([
        SupplierModel.getContacts(db, id),
        SupplierModel.getAddresses(db, id),
        SupplierModel.getScorecardById(db, id)
      ])

      res.json({
        success: true,
        data: {
          ...supplier,
          contacts,
          addresses,
          scorecard
        }
      })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * POST /suppliers
   * Create new supplier
   */
  static async create(req, res) {
    try {
      const { db } = req.app.locals

      // Validate required fields
      const { name, gstin } = req.body
      if (!name || !gstin) {
        return res.status(400).json({
          success: false,
          error: 'Supplier name and GSTIN are required'
        })
      }

      const supplier = await SupplierModel.create(db, req.body)
      res.status(201).json({ success: true, data: supplier })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * PUT /suppliers/:id
   * Update supplier
   */
  static async update(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      // Check if supplier exists
      const existing = await SupplierModel.getById(db, id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Supplier not found' })
      }

      const supplier = await SupplierModel.update(db, id, req.body)
      res.json({ success: true, data: supplier })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * DELETE /suppliers/:id
   * Delete supplier
   */
  static async delete(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      // Check if supplier exists
      const supplier = await SupplierModel.getById(db, id)
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' })
      }

      await SupplierModel.delete(db, id)
      res.json({ success: true, message: 'Supplier deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /suppliers/:id/deactivate
   * Deactivate supplier instead of deleting
   */
  static async deactivate(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const supplier = await SupplierModel.getById(db, id)
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Supplier not found' })
      }

      await SupplierModel.deactivate(db, id)
      res.json({ success: true, message: 'Supplier deactivated successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/groups
   * Get all supplier groups
   */
  static async getGroups(req, res) {
    try {
      const { db } = req.app.locals
      const groups = await SupplierModel.getGroups(db)
      res.json({ success: true, data: groups })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/group/:groupName
   * Get suppliers by group
   */
  static async getByGroup(req, res) {
    try {
      const { db } = req.app.locals
      const { groupName } = req.params
      const suppliers = await SupplierModel.getByGroup(db, groupName)
      res.json({ success: true, data: suppliers })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/search
   * Search suppliers with filters
   */
  static async search(req, res) {
    try {
      const { db } = req.app.locals
      const { term, group, active, minRating } = req.query

      const suppliers = await SupplierModel.search(db, term, {
        group: group || undefined,
        isActive: active === 'true' ? true : active === 'false' ? false : undefined,
        minRating: minRating ? parseFloat(minRating) : undefined
      })

      res.json({ success: true, data: suppliers })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/contacts/all
   * Get all contacts across all suppliers
   */
  static async getAllContacts(req, res) {
    try {
      const { db } = req.app.locals
      const contacts = await SupplierModel.getAllContacts(db)
      res.json({ success: true, data: contacts })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/:id/contacts
   * Get supplier contacts
   */
  static async getContacts(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const contacts = await SupplierModel.getContacts(db, id)
      res.json({ success: true, data: contacts })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/:id/addresses
   * Get supplier addresses
   */
  static async getAddresses(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const addresses = await SupplierModel.getAddresses(db, id)
      res.json({ success: true, data: addresses })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/:id/scorecard
   * Get supplier scorecard
   */
  static async getScorecard(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const scorecard = await SupplierModel.getScorecardById(db, id)
      if (!scorecard) {
        return res.status(404).json({ success: false, error: 'Scorecard not found' })
      }

      res.json({ success: true, data: scorecard })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /suppliers/statistics
   * Get supplier statistics
   */
  static async getStatistics(req, res) {
    try {
      const { db } = req.app.locals
      const statistics = await SupplierModel.getStatistics(db)
      res.json({ success: true, data: statistics })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}
