import GRNRequestModel from '../models/GRNRequestModel.js'
import StockEntryModel from '../models/StockEntryModel.js'
import StockBalanceModel from '../models/StockBalanceModel.js'
import { PurchaseOrderModel } from '../models/PurchaseOrderModel.js'
import { MaterialRequestModel } from '../models/MaterialRequestModel.js'

export const generateGRNNo = async (req, res) => {
  try {
    const grnNo = await GRNRequestModel.generateGRNNo()
    res.json({ success: true, data: { grn_no: grnNo } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const qcApproveGRN = async (req, res) => {
  try {
    const userId = req.user?.id || 1
    const grnId = req.params.id

    const grn = await GRNRequestModel.getById(grnId)
    if (!grn) {
      return res.status(404).json({ success: false, error: 'GRN request not found' })
    }

    if (grn.status !== 'inspecting') {
      return res.status(400).json({ success: false, error: 'GRN must be in inspecting status for QC approval' })
    }

    const acceptedItems = grn.items?.filter(item => item.item_status === 'accepted' || item.item_status === 'partially_accepted') || []
    if (acceptedItems.length === 0) {
      return res.status(400).json({ success: false, error: 'No accepted items to approve' })
    }

    const allQCPassed = acceptedItems.every(item => {
      if (!item.qc_checks) return false
      const checks = typeof item.qc_checks === 'string' ? JSON.parse(item.qc_checks) : item.qc_checks
      const passedCount = Object.values(checks).filter(Boolean).length
      return passedCount === 4
    })

    if (!allQCPassed) {
      return res.status(400).json({ success: false, error: 'Not all accepted items passed QC checks' })
    }

    const updatedGRN = await GRNRequestModel.qcApprove(grnId, userId)
    res.json({ success: true, data: updatedGRN, message: 'GRN approved by QC and sent to inventory' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createGRNRequest = async (req, res) => {
  try {
    const { 
      grn_no, po_no, supplier_id, supplier_name, receipt_date, items, notes,
      material_request_id, department, purpose
    } = req.body
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
      notes,
      material_request_id,
      department,
      purpose
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

export const createGRNFromMaterialRequest = async (req, res) => {
  try {
    const { material_request_id, items, department, purpose, notes } = req.body
    const userId = req.user?.id || 1

    if (!material_request_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing material request ID or items' })
    }

    const grn_no = await GRNRequestModel.generateGRNNo()
    const receipt_date = new Date().toISOString().split('T')[0]

    const grnItems = items.map(item => ({
      item_code: item.item_code,
      item_name: item.item_name,
      po_qty: item.qty,
      received_qty: item.qty,
      batch_no: item.batch_no || '',
      warehouse_name: 'Main Warehouse'
    }))

    const grnRequest = await GRNRequestModel.create({
      grn_no,
      po_no: null,
      supplier_id: null,
      supplier_name: null,
      receipt_date,
      created_by: userId,
      items: grnItems,
      notes: notes || `Created from Material Request`
    })

    const db = global.db
    await db.query(
      `UPDATE grn_requests SET material_request_id = ?, department = ?, purpose = ? WHERE id = ?`,
      [material_request_id, department, purpose, grnRequest.id]
    )

    const approvedItems = grnRequest.items.map(item => ({
      id: item.id,
      accepted_qty: item.received_qty,
      rejected_qty: 0,
      warehouse: item.warehouse_name
    }))

    await GRNRequestModel.sendToInventory(grnRequest.id, userId, approvedItems)

    await db.query(
      `UPDATE material_request SET status = 'pending' WHERE mr_id = ?`,
      [material_request_id]
    )

    const updatedGRN = await GRNRequestModel.getById(grnRequest.id)

    res.status(201).json({ success: true, data: updatedGRN, message: 'GRN created from material request successfully' })
  } catch (error) {
    console.error('Error creating GRN from material request:', error)
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

    const updatedGRN = await GRNRequestModel.inventoryApprove(grnId, userId, approvedItems)

    res.json({ 
      success: true, 
      data: updatedGRN, 
      message: 'GRN approved and stock updated successfully' 
    })
  } catch (error) {
    console.error('Error in inventoryApproveGRN:', error)
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
