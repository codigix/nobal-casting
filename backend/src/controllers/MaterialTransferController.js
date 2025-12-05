import MaterialTransferModel from '../models/MaterialTransferModel.js'

export const getAllMaterialTransfers = async (req, res) => {
  try {
    const { status, fromWarehouseId, toWarehouseId, startDate, endDate, search } = req.query
    const filters = {
      status,
      fromWarehouseId,
      toWarehouseId,
      startDate,
      endDate,
      search
    }

    const transfers = await MaterialTransferModel.getAll(filters)
    res.json({ success: true, data: transfers, count: transfers.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getMaterialTransfer = async (req, res) => {
  try {
    const transfer = await MaterialTransferModel.getById(req.params.id)
    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Material transfer not found' })
    }

    res.json({ success: true, data: transfer })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createMaterialTransfer = async (req, res) => {
  try {
    const {
      transfer_no,
      transfer_date,
      from_warehouse_id,
      to_warehouse_id,
      transfer_remarks,
      items = []
    } = req.body

    if (!transfer_no || !transfer_date || !from_warehouse_id || !to_warehouse_id || !items.length) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    if (from_warehouse_id === to_warehouse_id) {
      return res.status(400).json({ success: false, error: 'Source and destination warehouses must be different' })
    }

    const transfer = await MaterialTransferModel.create({
      transfer_no,
      transfer_date,
      from_warehouse_id,
      to_warehouse_id,
      transfer_remarks,
      created_by: req.user?.id,
      items
    })

    res.status(201).json({ success: true, data: transfer })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const sendMaterialTransfer = async (req, res) => {
  try {
    const transfer = await MaterialTransferModel.sendTransfer(req.params.id, req.user?.id)

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Material transfer not found' })
    }

    res.json({ success: true, data: transfer, message: 'Transfer sent for shipment' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const receiveMaterialTransfer = async (req, res) => {
  try {
    const transfer = await MaterialTransferModel.receiveTransfer(req.params.id, req.user?.id)

    if (!transfer) {
      return res.status(404).json({ success: false, error: 'Material transfer not found' })
    }

    res.json({ success: true, data: transfer, message: 'Transfer received and stock updated' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getTransferRegister = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const filters = { startDate, endDate }

    const register = await MaterialTransferModel.getTransferRegister(filters)
    res.json({ success: true, data: register })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getNextTransferNumber = async (req, res) => {
  try {
    const transferNo = await MaterialTransferModel.generateTransferNo()
    res.json({ success: true, data: { transfer_no: transferNo } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getTransferStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    const filters = { startDate, endDate }
    const transfers = await MaterialTransferModel.getAll(filters)

    const stats = {
      total_transfers: transfers.length,
      by_status: {},
      pending_receipt: 0,
      total_items: 0,
      total_qty: 0
    }

    transfers.forEach(transfer => {
      // By status
      if (!stats.by_status[transfer.status]) {
        stats.by_status[transfer.status] = 0
      }
      stats.by_status[transfer.status]++

      if (transfer.status === 'In Transit') {
        stats.pending_receipt++
      }

      stats.total_items += transfer.items?.length || 0
      stats.total_qty += transfer.total_qty || 0
    })

    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}