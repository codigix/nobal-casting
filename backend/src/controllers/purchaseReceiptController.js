import { PurchaseReceiptModel } from '../models/PurchaseReceiptModel.js'

export async function createGRN(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseReceiptModel(db)

    const result = await model.create(req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getGRN(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseReceiptModel(db)

    const grn = await model.getById(req.params.grn_no)
    if (!grn) {
      return res.status(404).json({ success: false, error: 'GRN not found' })
    }

    res.json({ success: true, data: grn })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function listGRNs(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseReceiptModel(db)

    const filters = {
      supplier_id: req.query.supplier_id,
      status: req.query.status,
      po_no: req.query.po_no,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    }

    const grns = await model.getAll(filters)
    res.json({ success: true, data: grns })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function updateGRNItem(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseReceiptModel(db)

    const result = await model.updateItem(req.params.grn_item_id, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function acceptGRN(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseReceiptModel(db)

    const result = await model.accept(req.params.grn_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function rejectGRN(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseReceiptModel(db)

    const result = await model.reject(req.params.grn_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function deleteGRN(req, res) {
  try {
    const db = req.app.locals.db
    const model = new PurchaseReceiptModel(db)

    const result = await model.delete(req.params.grn_no)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}