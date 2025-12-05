import ReorderManagementModel from '../models/ReorderManagementModel.js'

export const getAllReorderRequests = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query
    const filters = {
      status,
      startDate,
      endDate
    }

    const requests = await ReorderManagementModel.getAll(filters)
    res.json({ success: true, data: requests, count: requests.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getReorderRequest = async (req, res) => {
  try {
    const request = await ReorderManagementModel.getById(req.params.id)
    if (!request) {
      return res.status(404).json({ success: false, error: 'Reorder request not found' })
    }

    res.json({ success: true, data: request })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const generateReorderRequest = async (req, res) => {
  try {
    const reorderRequest = await ReorderManagementModel.generateReorderRequest()

    res.status(201).json({
      success: true,
      data: reorderRequest,
      message: `Reorder request generated with ${reorderRequest.items.length} items`
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createMaterialRequestFromReorder = async (req, res) => {
  try {
    const mrNo = await ReorderManagementModel.createMaterialRequest(req.params.id, req.user?.id)

    res.json({
      success: true,
      data: { mr_no: mrNo },
      message: `Material Request ${mrNo} created`
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const markReorderReceived = async (req, res) => {
  try {
    const { poNo } = req.body

    if (!poNo) {
      return res.status(400).json({ success: false, error: 'PO number is required' })
    }

    const reorder = await ReorderManagementModel.markReceived(req.params.id, poNo)

    res.json({
      success: true,
      data: reorder,
      message: 'Reorder marked as received'
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getLowStockSummary = async (req, res) => {
  try {
    const { warehouse, priority } = req.query
    const filters = { warehouse, priority }

    const summary = await ReorderManagementModel.getLowStockSummary(filters)
    res.json({ success: true, data: summary, count: summary.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getReorderStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const filters = { startDate, endDate }

    const statistics = await ReorderManagementModel.getReorderStatistics(filters)
    res.json({ success: true, data: statistics })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getDashboardData = async (req, res) => {
  try {
    // Get low stock summary
    const lowStockItems = await ReorderManagementModel.getLowStockSummary({})
    
    // Get reorder statistics
    const stats = await ReorderManagementModel.getReorderStatistics({})

    // Group low stock by priority
    const priorityCount = {
      critical: lowStockItems.filter(item => item.priority === 'Critical').length,
      urgent: lowStockItems.filter(item => item.priority === 'Urgent').length,
      soon: lowStockItems.filter(item => item.priority === 'Soon').length
    }

    res.json({
      success: true,
      data: {
        low_stock_items: lowStockItems.slice(0, 10),
        low_stock_priority: priorityCount,
        reorder_statistics: stats,
        total_items_below_reorder: lowStockItems.length
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}