import StockBalanceModel from '../models/StockBalanceModel.js'

export const getAllStockBalance = async (req, res) => {
  try {
    const { warehouseId, itemId, search, stockStatus, isLocked } = req.query
    const filters = {
      department: req.user?.department || 'all',
      warehouseId,
      itemId,
      search,
      stockStatus,
      isLocked: isLocked !== undefined ? isLocked === 'true' : undefined
    }

    const stockBalances = await StockBalanceModel.getAll(filters)
    res.json({ success: true, data: stockBalances, count: stockBalances.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getStockBalanceDetail = async (req, res) => {
  try {
    const stockBalance = await StockBalanceModel.getByItemAndWarehouse(
      req.params.itemCode || req.params.itemId,
      req.params.warehouseId
    )

    if (!stockBalance) {
      return res.status(404).json({ success: false, error: 'Stock balance not found' })
    }

    res.json({ success: true, data: stockBalance })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getLowStockItems = async (req, res) => {
  try {
    const { warehouseId } = req.query
    const filters = {
      department: req.user?.department || 'all',
      warehouseId
    }

    const lowStockItems = await StockBalanceModel.getLowStockItems(filters)
    res.json({ success: true, data: lowStockItems, count: lowStockItems.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getStockValueSummary = async (req, res) => {
  try {
    const filters = {
      department: req.user?.department || 'all'
    }

    const summary = await StockBalanceModel.getStockValueSummary(filters)
    res.json({ success: true, data: summary })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateStockBalance = async (req, res) => {
  try {
    const { itemCode, itemId, warehouseId } = req.params
    const { current_qty, reserved_qty, valuation_rate, last_receipt_date, last_issue_date } = req.body

    const updated = await StockBalanceModel.upsert(itemCode || itemId, warehouseId, {
      current_qty,
      reserved_qty,
      valuation_rate,
      last_receipt_date,
      last_issue_date
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const lockWarehouseStock = async (req, res) => {
  try {
    const { reason } = req.body
    const affected = await StockBalanceModel.lockWarehouseStock(
      req.params.warehouseId,
      reason,
      req.user?.id
    )

    res.json({ success: true, message: 'Stock locked', affected })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const unlockWarehouseStock = async (req, res) => {
  try {
    const affected = await StockBalanceModel.unlockWarehouseStock(req.params.warehouseId)
    res.json({ success: true, message: 'Stock unlocked', affected })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateAvailableQty = async (req, res) => {
  try {
    const { itemId, warehouseId } = req.params
    const { qty, operation } = req.body

    if (!qty || (operation !== 'add' && operation !== 'subtract')) {
      return res.status(400).json({ success: false, error: 'Invalid operation' })
    }

    const updated = await StockBalanceModel.updateAvailableQty(
      itemId,
      warehouseId,
      qty,
      operation
    )

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getDashboardSummary = async (req, res) => {
  try {
    const filters = {
      department: req.user?.department || 'all'
    }

    // Get all summaries
    const valueSummary = await StockBalanceModel.getStockValueSummary(filters)
    const lowStockItems = await StockBalanceModel.getLowStockItems(filters)

    // Calculate totals
    let totalItems = 0
    let totalValue = 0
    let totalQty = 0

    valueSummary.forEach(summary => {
      totalItems += summary.total_items
      totalValue += summary.total_value || 0
      totalQty += summary.total_qty || 0
    })

    res.json({
      success: true,
      data: {
        totalItems,
        totalValue,
        totalQty,
        warehouseCount: valueSummary.length,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 5), // Top 5
        warehouseStats: valueSummary
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}