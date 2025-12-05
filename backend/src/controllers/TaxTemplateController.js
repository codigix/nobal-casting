import { TaxTemplateModel } from '../models/TaxTemplateModel.js'

export class TaxTemplateController {
  static async getAll(req, res) {
    try {
      const { db } = req.app.locals
      const templates = await TaxTemplateModel.getAll(db)
      res.json({ success: true, data: templates })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async getById(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const template = await TaxTemplateModel.getById(db, id)

      if (!template) {
        return res.status(404).json({ success: false, error: 'Tax template not found' })
      }

      res.json({ success: true, data: template })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async create(req, res) {
    try {
      const { db } = req.app.locals
      const { template_id, name } = req.body

      if (!template_id || !name) {
        return res.status(400).json({ success: false, error: 'template_id and name are required' })
      }

      const template = await TaxTemplateModel.create(db, { template_id, name })
      res.status(201).json({ success: true, data: template })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async update(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const { name } = req.body

      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' })
      }

      const template = await TaxTemplateModel.update(db, id, { name })
      res.json({ success: true, data: template })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async delete(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      await TaxTemplateModel.delete(db, id)
      res.json({ success: true, message: 'Tax template deleted successfully' })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async addTaxItem(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const { tax_item_id, tax_head, rate } = req.body

      if (!tax_item_id || !tax_head) {
        return res.status(400).json({ success: false, error: 'tax_item_id and tax_head are required' })
      }

      const template = await TaxTemplateModel.addTaxItem(db, {
        tax_item_id,
        template_id: id,
        tax_head,
        rate: rate || 0
      })

      res.json({ success: true, data: template })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async removeTaxItem(req, res) {
    try {
      const { db } = req.app.locals
      const { id, itemId } = req.params

      const template = await TaxTemplateModel.removeTaxItem(db, itemId, id)
      res.json({ success: true, data: template })
    } catch (error) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
}
