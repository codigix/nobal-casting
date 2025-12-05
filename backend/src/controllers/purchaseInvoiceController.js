import { PurchaseInvoiceModel } from '../models/PurchaseInvoiceModel.js'

export async function createInvoice(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseInvoiceModel(db)

    const result = await model.create(req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getInvoice(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseInvoiceModel(db)

    const invoice = await model.getById(req.params.invoice_no)
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' })
    }

    res.json({ success: true, data: invoice })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function listInvoices(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseInvoiceModel(db)

    const filters = {
      supplier_id: req.query.supplier_id,
      status: req.query.status,
      search: req.query.search,
      invoice_date_from: req.query.invoice_date_from,
      invoice_date_to: req.query.invoice_date_to,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    }

    const invoices = await model.getAll(filters)
    res.json({ success: true, data: invoices })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function submitInvoice(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseInvoiceModel(db)

    const result = await model.submit(req.params.invoice_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function markAsPaid(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseInvoiceModel(db)

    const result = await model.markAsPaid(req.params.invoice_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function deleteInvoice(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseInvoiceModel(db)

    const result = await model.delete(req.params.invoice_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}