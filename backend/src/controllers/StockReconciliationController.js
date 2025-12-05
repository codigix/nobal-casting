import StockReconciliationModel from '../models/StockReconciliationModel.js'

export const getAllReconciliations = async (req, res) => {
  try {
    const { status, warehouseId, startDate, endDate, search } = req.query
    const filters = {
      status,
      warehouseId,
      startDate,
      endDate,
      search
    }

    const reconciliations = await StockReconciliationModel.getAll(filters)
    res.json({ success: true, data: reconciliations, count: reconciliations.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getReconciliation = async (req, res) => {
  try {
    const reconciliation = await StockReconciliationModel.getById(req.params.id)
    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Reconciliation not found' })
    }

    res.json({ success: true, data: reconciliation })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createReconciliation = async (req, res) => {
  try {
    const {
      reconciliation_no,
      reconciliation_date,
      warehouse_id,
      purpose
    } = req.body

    if (!reconciliation_no || !reconciliation_date || !warehouse_id) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    const reconciliation = await StockReconciliationModel.create({
      reconciliation_no,
      reconciliation_date,
      warehouse_id,
      purpose,
      created_by: req.user?.id
    })

    res.status(201).json({ success: true, data: reconciliation })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const addReconciliationItems = async (req, res) => {
  try {
    const { items } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array required' })
    }

    const reconciliation = await StockReconciliationModel.addItems(req.params.id, items)

    res.json({ success: true, data: reconciliation })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const submitReconciliation = async (req, res) => {
  try {
    const reconciliation = await StockReconciliationModel.submit(req.params.id, req.user?.id)

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Reconciliation not found' })
    }

    res.json({ success: true, data: reconciliation, message: 'Reconciliation submitted' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const approveReconciliation = async (req, res) => {
  try {
    const reconciliation = await StockReconciliationModel.approve(req.params.id, req.user?.id)

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Reconciliation not found' })
    }

    res.json({ success: true, data: reconciliation, message: 'Reconciliation approved and stock adjusted' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const cancelReconciliation = async (req, res) => {
  try {
    const reconciliation = await StockReconciliationModel.cancel(req.params.id, req.user?.id)

    if (!reconciliation) {
      return res.status(404).json({ success: false, error: 'Reconciliation not found' })
    }

    res.json({ success: true, data: reconciliation, message: 'Reconciliation cancelled' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getNextReconciliationNumber = async (req, res) => {
  try {
    const reconciliationNo = await StockReconciliationModel.generateReconciliationNo()
    res.json({ success: true, data: { reconciliation_no: reconciliationNo } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getVarianceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const filters = { startDate, endDate }

    const summary = await StockReconciliationModel.getVarianceSummary(filters)
    res.json({ success: true, data: summary })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getReconciliationStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const filters = { startDate, endDate }
    const reconciliations = await StockReconciliationModel.getAll(filters)

    const stats = {
      total_reconciliations: reconciliations.length,
      by_status: {},
      total_variance_items: 0,
      total_variance_value: 0
    }

    reconciliations.forEach(rec => {
      if (!stats.by_status[rec.status]) {
        stats.by_status[rec.status] = 0
      }
      stats.by_status[rec.status]++

      stats.total_variance_items += rec.variance_count || 0
      stats.total_variance_value += rec.total_variance_value || 0
    })

    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}