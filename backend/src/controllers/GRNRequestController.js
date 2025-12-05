import GRNRequestModel from '../models/GRNRequestModel.js'
import StockEntryModel from '../models/StockEntryModel.js'

export const createGRNRequest = async (req, res) => {
  try {
    const { grn_no, po_no, supplier_id, supplier_name, receipt_date, items, notes } = req.body
    const userId = req.user?.id || 1

    if (!grn_no || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    const grnRequest = await GRNRequestModel.create({
      grn_no,
      po_no,
      supplier_id,
      supplier_name,
      receipt_date,
      created_by: userId,
      items,
      notes
    })

    const approvedItems = grnRequest.items.map(item => ({
      id: item.id,
      accepted_qty: item.received_qty,
      rejected_qty: 0,
      warehouse: item.warehouse_name
    }))

    await GRNRequestModel.sendToInventory(grnRequest.id, userId, approvedItems)

    const updatedGRN = await GRNRequestModel.getById(grnRequest.id)

    res.status(201).json({ success: true, data: updatedGRN, message: 'GRN request created and sent to inventory for approval' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getGRNRequest = async (req, res) => {
  try {
    const grn = await GRNRequestModel.getById(req.params.id)
    if (!grn) {
      return res.status(404).json({ success: false, error: 'GRN request not found' })
    }
    res.json({ success: true, data: grn })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getAllGRNRequests = async (req, res) => {
  try {
    const { status, assigned_to, search, created_by } = req.query
    const filters = { status, assigned_to, search, created_by }

    const grns = await GRNRequestModel.getAll(filters)
    res.json({ success: true, data: grns, count: grns.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const startInspection = async (req, res) => {
  try {
    const userId = req.user?.id || 1
    const grn = await GRNRequestModel.markInspecting(req.params.id, userId)

    res.json({ success: true, data: grn, message: 'Inspection started' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const sendToInventory = async (req, res) => {
  try {
    const { approvedItems } = req.body
    const userId = req.user?.id || 1
    const grnId = req.params.id

    if (!approvedItems || approvedItems.length === 0) {
      return res.status(400).json({ success: false, error: 'No items to send' })
    }

    const grn = await GRNRequestModel.sendToInventory(grnId, userId, approvedItems)
    res.json({ success: true, data: grn, message: 'GRN sent to inventory department for approval' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const inventoryApproveGRN = async (req, res) => {
  try {
    const userId = req.user?.id || 1
    const grnId = req.params.id
    const { approvedItems = [] } = req.body
    const db = global.db

    const grn = await GRNRequestModel.getById(grnId)
    if (!grn) {
      return res.status(404).json({ success: false, error: 'GRN request not found' })
    }

    if (approvedItems.length > 0) {
      for (const item of approvedItems) {
        const acceptedQty = Number(item.accepted_qty) || 0
        const rejectedQty = Number(item.rejected_qty) || 0
        const totalQty = acceptedQty + rejectedQty
        const originalItem = grn.items.find(i => i.id === item.id)
        const receivedQty = Number(originalItem?.received_qty) || 0
        
        if (!originalItem) {
          return res.status(400).json({ 
            success: false, 
            error: `Item with id ${item.id} not found in GRN` 
          })
        }
        
        if (totalQty !== receivedQty) {
          console.error(`Qty mismatch: accepted=${acceptedQty}, rejected=${rejectedQty}, total=${totalQty}, received=${receivedQty}`)
          return res.status(400).json({ 
            success: false, 
            error: `Item ${originalItem.item_code}: accepted (${acceptedQty}) + rejected (${rejectedQty}) must equal received (${receivedQty})` 
          })
        }

        if (!item.warehouse_name) {
          return res.status(400).json({ 
            success: false, 
            error: `Item ${originalItem.item_code}: warehouse location is required` 
          })
        }

        const updateFields = {
          accepted_qty: acceptedQty,
          rejected_qty: rejectedQty,
          qc_status: item.qc_status || 'pass',
          bin_rack: item.bin_rack || null,
          valuation_rate: Number(item.valuation_rate) || 0
        }

        if (item.warehouse_name) {
          updateFields.warehouse_name = item.warehouse_name
        }

        await db.query(
          `UPDATE grn_request_items SET 
           accepted_qty = ?, 
           rejected_qty = ?,
           qc_status = ?,
           bin_rack = ?,
           valuation_rate = ?,
           warehouse_name = ?
           WHERE id = ?`,
          [
            updateFields.accepted_qty,
            updateFields.rejected_qty,
            updateFields.qc_status,
            updateFields.bin_rack,
            updateFields.valuation_rate,
            updateFields.warehouse_name || 'Main Warehouse',
            item.id
          ]
        )
      }
    }

    const updatedGRN = await GRNRequestModel.inventoryApprove(grnId, userId)

    const stockEntryItems = []
    let toWarehouseId = null

    for (const item of (updatedGRN.items || [])) {
      const acceptedQty = Number(item.accepted_qty) || 0
      if (acceptedQty > 0) {
        stockEntryItems.push({
          item_code: item.item_code,
          qty: acceptedQty,
          uom: 'Kg',
          valuation_rate: Number(item.valuation_rate) || 0,
          batch_no: item.batch_no || ''
        })

        if (!toWarehouseId && item.warehouse_name) {
          const [warehouseRows] = await db.query(
            'SELECT id FROM warehouses WHERE warehouse_name = ? OR warehouse_code = ?',
            [item.warehouse_name, item.warehouse_name]
          )
          if (warehouseRows[0]) {
            toWarehouseId = warehouseRows[0].id
          }
        }
      }
    }

    if (stockEntryItems.length > 0) {
      try {
        if (!toWarehouseId) {
          const [defaultWarehouse] = await db.query(
            'SELECT id FROM warehouses LIMIT 1'
          )
          toWarehouseId = defaultWarehouse[0]?.id || 1
        }

        const entry_no = await StockEntryModel.generateEntryNo('Material Receipt')
        
        console.log('Creating stock entry with:', {
          entry_no,
          to_warehouse_id: toWarehouseId,
          items_count: stockEntryItems.length,
          items: stockEntryItems
        })

        const stockEntry = await StockEntryModel.create({
          entry_no,
          entry_date: new Date(),
          entry_type: 'Material Receipt',
          from_warehouse_id: null,
          to_warehouse_id: toWarehouseId,
          purpose: `GRN Approved - ${updatedGRN.grn_no}`,
          reference_doctype: 'GRN Request',
          reference_name: updatedGRN.grn_no,
          remarks: `Auto-generated from GRN Request ${updatedGRN.grn_no} - Inventory Approved`,
          created_by: userId,
          items: stockEntryItems
        })

        console.log('Stock entry created:', stockEntry.id)

        if (stockEntry && stockEntry.id) {
          const submittedEntry = await StockEntryModel.submit(stockEntry.id, userId)
          console.log('Stock entry submitted:', submittedEntry.id)

          for (const item of (updatedGRN.items || [])) {
            const acceptedQty = Number(item.accepted_qty) || 0
            if (acceptedQty > 0) {
              const itemWarehouse = item.warehouse_name
              const [warehouseRows] = await db.query(
                'SELECT id FROM warehouses WHERE warehouse_name = ? OR warehouse_code = ?',
                [itemWarehouse, itemWarehouse]
              )
              const warehouseId = warehouseRows[0]?.id || toWarehouseId

              const valuationRate = Number(item.valuation_rate) || 0
              const totalValue = acceptedQty * valuationRate

              await db.query(
                `INSERT INTO stock_balance 
                  (item_code, warehouse_id, current_qty, reserved_qty, available_qty, valuation_rate, total_value, last_receipt_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)
                ON DUPLICATE KEY UPDATE 
                  current_qty = current_qty + ?,
                  available_qty = available_qty + ?,
                  valuation_rate = ?,
                  total_value = total_value + ?,
                  last_receipt_date = CURRENT_DATE,
                  updated_at = CURRENT_TIMESTAMP`,
                [
                  item.item_code,
                  warehouseId,
                  acceptedQty,
                  0,
                  acceptedQty,
                  valuationRate,
                  totalValue,
                  acceptedQty,
                  acceptedQty,
                  valuationRate,
                  totalValue
                ]
              )

              console.log(`Updated stock balance for ${item.item_code}: +${acceptedQty} units`)
            }
          }
        }
      } catch (stockError) {
        console.error('Error creating/submitting stock entry:', stockError.message)
        console.error('Stack:', stockError.stack)
      }
    }

    res.json({ success: true, data: updatedGRN, message: 'GRN approved by inventory and items stored successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const approveGRNRequest = async (req, res) => {
  return sendToInventory(req, res)
}

export const rejectGRNRequest = async (req, res) => {
  try {
    const { reason } = req.body
    const userId = req.user?.id || 1

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Rejection reason required' })
    }

    const grn = await GRNRequestModel.reject(req.params.id, userId, reason)

    res.json({ success: true, data: grn, message: 'GRN request rejected' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const sendBackGRNRequest = async (req, res) => {
  try {
    const { reason } = req.body
    const userId = req.user?.id || 1

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason required' })
    }

    const grn = await GRNRequestModel.sendBack(req.params.id, userId, reason)

    res.json({ success: true, data: grn, message: 'GRN request sent back' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateItemStatus = async (req, res) => {
  try {
    const { itemId, status, notes } = req.body

    await GRNRequestModel.updateItemStatus(itemId, status, notes)

    res.json({ success: true, message: 'Item status updated' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const inspectItem = async (req, res) => {
  try {
    const { itemId, status, notes, accepted_qty, rejected_qty, qc_checks } = req.body
    const grnId = req.params.id

    if (!itemId || !status) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    await GRNRequestModel.inspectItem(itemId, {
      status,
      notes,
      accepted_qty: accepted_qty || 0,
      rejected_qty: rejected_qty || 0,
      qc_checks: qc_checks || {}
    })

    const grn = await GRNRequestModel.getById(grnId)
    res.json({ success: true, data: grn, message: 'Item inspection recorded' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
