import BatchTrackingModel from '../models/BatchTrackingModel.js'

export const getAllBatches = async (req, res) => {
  try {
    const { itemId, warehouseId, status, search, expiredOnly } = req.query
    const filters = {
      itemId,
      warehouseId,
      status,
      search,
      expiredOnly: expiredOnly === 'true'
    }

    const batches = await BatchTrackingModel.getAll(filters)
    res.json({ success: true, data: batches, count: batches.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getBatch = async (req, res) => {
  try {
    const batch = await BatchTrackingModel.getById(req.params.id)
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' })
    }

    res.json({ success: true, data: batch })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createBatch = async (req, res) => {
  try {
    const {
      batch_no,
      item_id,
      batch_qty,
      mfg_date,
      expiry_date,
      warehouse_id,
      reference_doctype,
      reference_name,
      remarks
    } = req.body

    if (!batch_no || !item_id || !batch_qty) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    const batch = await BatchTrackingModel.create({
      batch_no,
      item_id,
      batch_qty,
      mfg_date,
      expiry_date,
      warehouse_id,
      reference_doctype,
      reference_name,
      remarks
    })

    res.status(201).json({ success: true, data: batch })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateBatchQty = async (req, res) => {
  try {
    const { qtyUsed } = req.body

    if (!qtyUsed || qtyUsed <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid quantity' })
    }

    const batch = await BatchTrackingModel.updateQty(req.params.id, qtyUsed)
    res.json({ success: true, data: batch })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const markBatchExpired = async (req, res) => {
  try {
    const batch = await BatchTrackingModel.markExpired(req.params.id)
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' })
    }

    res.json({ success: true, data: batch, message: 'Batch marked as expired' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const markBatchScrapped = async (req, res) => {
  try {
    const { reason } = req.body

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Scrap reason is required' })
    }

    const batch = await BatchTrackingModel.markScrapped(req.params.id, reason)
    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' })
    }

    res.json({ success: true, data: batch, message: 'Batch marked as scrapped' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getExpiredBatches = async (req, res) => {
  try {
    const { warehouseId } = req.query
    const filters = { warehouseId }

    const batches = await BatchTrackingModel.getExpiredBatches(filters)
    res.json({ success: true, data: batches, count: batches.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getNearExpiryBatches = async (req, res) => {
  try {
    const { warehouseId, daysThreshold = 30 } = req.query
    const filters = { warehouseId }

    const batches = await BatchTrackingModel.getNearExpiryBatches(parseInt(daysThreshold), filters)
    res.json({ success: true, data: batches, count: batches.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getBatchTraceability = async (req, res) => {
  try {
    const { batchNo } = req.params

    const traceability = await BatchTrackingModel.getBatchTraceability(batchNo)
    if (!traceability) {
      return res.status(404).json({ success: false, error: 'Batch not found' })
    }

    res.json({ success: true, data: traceability })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getItemBatchSummary = async (req, res) => {
  try {
    const { itemId, warehouseId } = req.params

    const summary = await BatchTrackingModel.getItemBatchSummary(itemId, warehouseId)
    res.json({ success: true, data: summary })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}