import { MaterialRequestModel } from '../models/MaterialRequestModel.js'
import { ItemModel } from '../models/ItemModel.js'

export class MaterialRequestController {
  /**
   * GET /material-requests
   * Get all material requests with optional filters
   */
  static async getAll(req, res) {
    try {
      const { db } = req.app.locals
      const { status, department, search } = req.query

      const filters = {}
      if (status) filters.status = status
      if (department) filters.department = department
      if (search) filters.search = search

      const requests = await MaterialRequestModel.getAll(db, filters)
      res.json({ success: true, data: requests })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /material-requests/:id
   * Get material request by ID with details
   */
  static async getById(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const request = await MaterialRequestModel.getById(db, id)
      if (!request) {
        return res.status(404).json({ success: false, error: 'Material request not found' })
      }

      res.json({ success: true, data: request })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * POST /material-requests
   * Create new material request
   */
  static async create(req, res) {
    try {
      const { db } = req.app.locals

      const { requested_by_id, department, required_by_date, purpose, items } = req.body

      if (!requested_by_id || !department || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: requested_by_id, department, required_by_date, items'
        })
      }

      // Validate items
      for (const item of items) {
        if (!item.item_code || !item.qty) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have item_code and qty'
          })
        }
      }

      const result = await MaterialRequestModel.create(db, req.body)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * PUT /material-requests/:id
   * Update material request
   */
  static async update(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const existing = await MaterialRequestModel.getById(db, id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Material request not found' })
      }

      const result = await MaterialRequestModel.update(db, id, req.body)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /material-requests/:id/approve
   * Approve material request
   */
  static async approve(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const result = await MaterialRequestModel.approve(db, id, req.body.approvedBy)
      res.json({ success: true, data: result, message: 'Material request approved' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /material-requests/:id/reject
   * Reject material request
   */
  static async reject(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const { reason } = req.body

      const result = await MaterialRequestModel.reject(db, id, reason)
      res.json({ success: true, data: result, message: 'Material request rejected' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * DELETE /material-requests/:id
   * Delete material request
   */
  static async delete(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const existing = await MaterialRequestModel.getById(db, id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Material request not found' })
      }

      await MaterialRequestModel.delete(db, id)
      res.json({ success: true, message: 'Material request deleted' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /material-requests/pending
   * Get pending material requests for approval
   */
  static async getPending(req, res) {
    try {
      const { db } = req.app.locals
      const requests = await MaterialRequestModel.getPending(db)
      res.json({ success: true, data: requests })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /material-requests/approved
   * Get approved material requests (for RFQ creation)
   */
  static async getApproved(req, res) {
    try {
      const { db } = req.app.locals
      const requests = await MaterialRequestModel.getApproved(db)
      res.json({ success: true, data: requests })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /material-requests/departments
   * Get list of departments
   */
  static async getDepartments(req, res) {
    try {
      const { db } = req.app.locals
      const departments = await MaterialRequestModel.getDepartments(db)
      res.json({ success: true, data: departments })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /material-requests/:id/convert-to-po
   * Convert material request to PO
   */
  static async convertToPO(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const result = await MaterialRequestModel.convertToPO(db, id)
      res.json({ success: true, data: result, message: 'Material request converted to PO' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }
}