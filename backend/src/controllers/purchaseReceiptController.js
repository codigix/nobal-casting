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

export async function createFromMaterialRequest(req, res) {
  try {
    const db = req.app.locals.db
    const { mr_id, items, department, purpose } = req.body

    console.log('createFromMaterialRequest called with:', { 
      mr_id, 
      itemCount: items?.length,
      department,
      purpose
    })

    if (!mr_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Material Request ID and items are required'
      })
    }

    if (department === 'Production' && purpose !== 'material_issue') {
      return res.status(400).json({
        success: false,
        error: 'Production department requests must use "Material Issue" purpose. Cannot create Purchase Receipt.'
      })
    }

    const model = new PurchaseReceiptModel(db)

    const receiptData = {
      mr_id: mr_id,
      po_no: null,
      supplier_id: null,
      receipt_date: new Date(),
      created_by: req.user?.id || 'system',
      items: items.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        received_qty: 0,
        accepted_qty: 0,
        warehouse_code: null,
        batch_no: null,
        quality_inspection_required: true,
        po_qty: item.qty,
        uom: item.uom
      })),
      notes: `Created from Material Request ${mr_id} (${department} - ${purpose}). Supplier and PO details pending.`
    }

    console.log('Receipt data prepared for MR:', receiptData)

    const result = await model.create(receiptData)

    console.log('Purchase Receipt created successfully from MR:', result)

    res.status(201).json({
      success: true,
      data: result,
      message: `Purchase Receipt created for ${items.length} unavailable item(s) from Material Request ${mr_id}`
    })
  } catch (error) {
    console.error('createFromMaterialRequest error:', error)
    res.status(400).json({ success: false, error: error.message })
  }
}