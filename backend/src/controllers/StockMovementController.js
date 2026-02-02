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
      source_warehouse_id,
      target_warehouse_id,
      movement_type,
      purpose,
      quantity,
      reference_type,
      reference_name,
      notes
    } = req.body

    if (!item_code || !movement_type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      })
    }

    if (!['IN', 'OUT', 'TRANSFER'].includes(movement_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid movement type. Must be IN, OUT, or TRANSFER'
      })
    }

    if (movement_type === 'TRANSFER') {
      if (!source_warehouse_id || !target_warehouse_id) {
        return res.status(400).json({
          success: false,
          error: 'Transfer requires both source and target warehouses'
        })
      }
      if (source_warehouse_id === target_warehouse_id) {
        return res.status(400).json({
          success: false,
          error: 'Source and target warehouses must be different'
        })
      }
    } else {
      if (!warehouse_id) {
        return res.status(400).json({
          success: false,
          error: 'Warehouse is required for IN/OUT movements'
        })
      }
    }

    const transactionNo = await StockMovementModel.generateTransactionNo()
    const userId = req.user?.user_id || 'system'

    const movement = await StockMovementModel.create({
      transaction_no: transactionNo,
      item_code,
      warehouse_id: movement_type === 'TRANSFER' ? null : warehouse_id,
      source_warehouse_id: movement_type === 'TRANSFER' ? source_warehouse_id : null,
      target_warehouse_id: movement_type === 'TRANSFER' ? target_warehouse_id : null,
      movement_type,
      purpose: purpose || 'Other',
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
