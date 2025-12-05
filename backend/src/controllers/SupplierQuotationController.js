import { SupplierQuotationModel } from '../models/SupplierQuotationModel.js'

export class SupplierQuotationController {
  /**
   * GET /quotations
   * Get all quotations with filters
   */
  static async getAll(req, res) {
    try {
      const { db } = req.app.locals
      const { status, supplier_id, rfq_id, search } = req.query

      const filters = {}
      if (status) filters.status = status
      if (supplier_id) filters.supplier_id = supplier_id
      if (rfq_id) filters.rfq_id = rfq_id
      if (search) filters.search = search

      const quotations = await SupplierQuotationModel.getAll(db, filters)
      res.json({ success: true, data: quotations })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /quotations/:id
   * Get quotation by ID
   */
  static async getById(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const quotation = await SupplierQuotationModel.getById(db, id)
      if (!quotation) {
        return res.status(404).json({ success: false, error: 'Quotation not found' })
      }

      res.json({ success: true, data: quotation })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * POST /quotations
   * Create new quotation
   */
  static async create(req, res) {
    try {
      const { db } = req.app.locals

      const { supplier_id, items } = req.body

      if (!supplier_id || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: supplier_id, items'
        })
      }

      // Calculate total value if not provided
      let total_value = req.body.total_value || 0
      if (total_value === 0 && items.length > 0) {
        total_value = items.reduce((sum, item) => sum + ((item.rate || 0) * (item.qty || 1)), 0)
      }

      const quotationData = {
        ...req.body,
        total_value
      }

      const result = await SupplierQuotationModel.create(db, quotationData)
      res.status(201).json({ success: true, data: result })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * PUT /quotations/:id
   * Update quotation
   */
  static async update(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const existing = await SupplierQuotationModel.getById(db, id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Quotation not found' })
      }

      const result = await SupplierQuotationModel.update(db, id, req.body)
      res.json({ success: true, data: result })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /quotations/:id/submit
   * Submit quotation
   */
  static async submit(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const result = await SupplierQuotationModel.submit(db, id)
      res.json({ success: true, data: result, message: 'Quotation submitted' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /quotations/:id/accept
   * Accept quotation
   */
  static async accept(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const result = await SupplierQuotationModel.accept(db, id)
      res.json({ success: true, data: result, message: 'Quotation accepted' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * PATCH /quotations/:id/reject
   * Reject quotation
   */
  static async reject(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const { reason } = req.body

      const result = await SupplierQuotationModel.reject(db, id, reason)
      res.json({ success: true, data: result, message: 'Quotation rejected' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * DELETE /quotations/:id
   * Delete quotation
   */
  static async delete(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const existing = await SupplierQuotationModel.getById(db, id)
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Quotation not found' })
      }

      await SupplierQuotationModel.delete(db, id)
      res.json({ success: true, message: 'Quotation deleted' })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /quotations/rfq/:rfqId
   * Get quotations for RFQ
   */
  static async getByRFQ(req, res) {
    try {
      const { db } = req.app.locals
      const { rfqId } = req.params

      const quotations = await SupplierQuotationModel.getByRFQ(db, rfqId)
      res.json({ success: true, data: quotations })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /quotations/supplier/:supplierId
   * Get quotations by supplier
   */
  static async getBySupplier(req, res) {
    try {
      const { db } = req.app.locals
      const { supplierId } = req.params

      const quotations = await SupplierQuotationModel.getBySupplier(db, supplierId)
      res.json({ success: true, data: quotations })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /quotations/rfq/:rfqId/compare
   * Compare quotations for RFQ
   */
  static async compareForRFQ(req, res) {
    try {
      const { db } = req.app.locals
      const { rfqId } = req.params

      const quotations = await SupplierQuotationModel.compareForRFQ(db, rfqId)
      res.json({ success: true, data: quotations })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  /**
   * GET /quotations/pending
   * Get pending quotations
   */
  static async getPending(req, res) {
    try {
      const { db } = req.app.locals

      const quotations = await SupplierQuotationModel.getPending(db)
      res.json({ success: true, data: quotations })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}