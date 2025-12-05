import { RFQModel } from '../models/RFQModel.js'

export class RFQController {
  /**
   * GET /rfqs
   * Get all RFQs with optional filters
   */
  static async getAll(req, res) {
    try {
      const { db } = req.app.locals
      const { status, search } = req.query

      const filters = {}
      if (status) filters.status = status
      if (search) filters.search = search

      const rfqs = await RFQModel.getAll(db, filters)
      res.json({ success: true, data: rfqs })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /rfqs/:id
   * Get RFQ by ID with details
   */
  static async getById(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const rfq = await RFQModel.getById(db, id)
      if (!rfq) {
        return res.status(404).json({ success: false, error: 'RFQ not found' })
      }

      res.json({ success: true, data: rfq })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * POST /rfqs
   * Create new RFQ
   */
  static async create(req, res) {
    try {
      const { db } = req.app.locals

      const { valid_till, items, suppliers } = req.body

      if (!valid_till) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: valid_till'
        })
      }

      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one item is required'
        })
      }

      if (!suppliers || suppliers.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one supplier is required'
        })
      }

      const result = await RFQModel.create(db, req.body)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * PUT /rfqs/:id
   * Update RFQ
   */
  static async update(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const existing = await RFQModel.getById(db, id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'RFQ not found' })
      }

      const result = await RFQModel.update(db, id, req.body)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /rfqs/:id/send
   * Send RFQ to suppliers
   */
  static async send(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const result = await RFQModel.send(db, id)
      res.json({ success: true, data: result, message: 'RFQ sent to suppliers' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /rfqs/:id/receive-responses
   * Mark RFQ as receiving responses
   */
  static async receiveResponses(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const result = await RFQModel.receiveResponses(db, id)
      res.json({ success: true, data: result, message: 'RFQ marked as receiving responses' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /rfqs/:id/close
   * Close RFQ
   */
  static async close(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const result = await RFQModel.close(db, id)
      res.json({ success: true, data: result, message: 'RFQ closed' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * DELETE /rfqs/:id
   * Delete RFQ
   */
  static async delete(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const existing = await RFQModel.getById(db, id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'RFQ not found' })
      }

      await RFQModel.delete(db, id)
      res.json({ success: true, message: 'RFQ deleted' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /rfqs/:id/responses
   * Get RFQ responses/quotations
   */
  static async getResponses(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const responses = await RFQModel.getResponses(db, id)
      res.json({ success: true, data: responses })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /rfqs/pending
   * Get pending RFQs
   */
  static async getPending(req, res) {
    try {
      const { db } = req.app.locals
      const rfqs = await RFQModel.getPending(db)
      res.json({ success: true, data: rfqs })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /rfqs/open
   * Get open RFQs
   */
  static async getOpen(req, res) {
    try {
      const { db } = req.app.locals
      const rfqs = await RFQModel.getOpen(db)
      res.json({ success: true, data: rfqs })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}