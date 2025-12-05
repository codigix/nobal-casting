import StockLedgerModel from '../models/StockLedgerModel.js'

export const getAllStockLedger = async (req, res) => {
  try {
    const { itemId, warehouseId, transactionType, startDate, endDate, search, department } = req.query
    const filters = {
      itemId,
      warehouseId,
      transactionType,
      startDate,
      endDate,
      search,
      department: department || req.user?.department || 'all'
    }

    const ledger = await StockLedgerModel.getAll(filters)
    res.json({ success: true, data: ledger, count: ledger.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getStockLedgerDetail = async (req, res) => {
  try {
    const detail = await StockLedgerModel.getById(req.params.id)
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Ledger entry not found' })
    }

    res.json({ success: true, data: detail })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getItemMovementHistory = async (req, res) => {
  try {
    const { itemId, warehouseId } = req.params
    const { limit } = req.query

    const history = await StockLedgerModel.getItemMovementHistory(
      itemId,
      warehouseId,
      parseInt(limit) || 100
    )

    res.json({ success: true, data: history, count: history.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getDailyConsumptionReport = async (req, res) => {
  try {
    const { warehouseId, startDate, endDate, department } = req.query
    const filters = {
      warehouseId,
      startDate,
      endDate,
      department: department || req.user?.department || 'all'
    }

    const report = await StockLedgerModel.getDailyConsumptionReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getStockValuationReport = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query
    const filters = {
      startDate,
      endDate,
      department: department || req.user?.department || 'all'
    }

    const report = await StockLedgerModel.getStockValuationReport(filters)
    res.json({ success: true, data: report })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getTransactionSummary = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query
    const filters = {
      startDate,
      endDate,
      department: department || req.user?.department || 'all'
    }

    const summary = await StockLedgerModel.getTransactionSummary(filters)
    res.json({ success: true, data: summary })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getMonthlyConsumptionChart = async (req, res) => {
  try {
    const { warehouseId, months = 6 } = req.query

    // Get consumption data
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - parseInt(months))

    const filters = {
      warehouseId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      department: req.user?.department || 'all'
    }

    const report = await StockLedgerModel.getDailyConsumptionReport(filters)

    // Group by month
    const chartData = {}
    report.forEach(item => {
      const date = new Date(item.transaction_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!chartData[monthKey]) {
        chartData[monthKey] = { date: monthKey, in: 0, out: 0, value: 0 }
      }

      chartData[monthKey].in += item.total_in || 0
      chartData[monthKey].out += item.total_out || 0
      chartData[monthKey].value += item.total_value || 0
    })

    const chartArray = Object.values(chartData)
    res.json({ success: true, data: chartArray })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}