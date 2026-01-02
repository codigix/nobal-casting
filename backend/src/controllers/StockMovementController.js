import StockMovementModel from '../models/StockMovementModel.js'

export async function getAllStockMovements(req, res) {
  try {
    const filters = {
      status: req.query.status,
      movementType: req.query.movement_type,
      warehouseId: req.query.warehouse_id,
      itemCode: req.query.item_code,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      search: req.query.search
    }

    const movements = await StockMovementModel.getAll(filters)
    res.json({
      success: true,
      data: movements
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function getStockMovement(req, res) {
  try {
    const { id } = req.params
    const movement = await StockMovementModel.getById(id)

    if (!movement) {
      return res.status(404).json({
        success: false,
        error: 'Stock movement not found'
      })
    }

    res.json({
      success: true,
      data: movement
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function createStockMovement(req, res) {
  try {
    const {
      item_code,
      warehouse_id,
      movement_type,
      quantity,
      reference_type,
      reference_name,
      notes
    } = req.body

    if (!item_code || !warehouse_id || !movement_type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    if (!['IN', 'OUT'].includes(movement_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid movement type. Must be IN or OUT'
      })
    }

    const transactionNo = await StockMovementModel.generateTransactionNo()
    const userId = req.user?.user_id || 'system'

    const movement = await StockMovementModel.create({
      transaction_no: transactionNo,
      item_code,
      warehouse_id,
      movement_type,
      quantity: parseFloat(quantity),
      reference_type: reference_type || 'Manual',
      reference_name,
      notes,
      created_by: userId
    })

    res.status(201).json({
      success: true,
      data: movement,
      message: 'Stock movement created successfully. Awaiting approval.'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function approveStockMovement(req, res) {
  try {
    const { id } = req.params
    const userId = req.user?.user_id || 'system'

    const movement = await StockMovementModel.approve(id, userId)

    res.json({
      success: true,
      data: movement,
      message: 'Stock movement approved successfully. Inventory updated.'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function rejectStockMovement(req, res) {
  try {
    const { id } = req.params
    const { reason } = req.body
    const userId = req.user?.user_id || 'system'

    const movement = await StockMovementModel.reject(id, userId, reason)

    res.json({
      success: true,
      data: movement,
      message: 'Stock movement cancelled.'
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

export async function getPendingMovements(req, res) {
  try {
    const movements = await StockMovementModel.getAll({ status: 'Pending' })
    const count = await StockMovementModel.getPendingCount()

    res.json({
      success: true,
      data: movements,
      count
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}
