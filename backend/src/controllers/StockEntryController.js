import StockEntryModel from '../models/StockEntryModel.js'

export const getAllStockEntries = async (req, res) => {
  try {
    const { status, entryType, warehouseId, startDate, endDate, search } = req.query
    const filters = {
      status,
      entryType,
      warehouseId,
      startDate,
      endDate,
      search
    }

    const entries = await StockEntryModel.getAll(filters)
    res.json({ success: true, data: entries, count: entries.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getStockEntry = async (req, res) => {
  try {
    const entry = await StockEntryModel.getById(req.params.id)
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Stock entry not found' })
    }

    res.json({ success: true, data: entry })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createStockEntry = async (req, res) => {
  try {
    const {
      entry_date,
      entry_type,
      from_warehouse_id,
      to_warehouse_id,
      purpose,
      reference_doctype,
      reference_name,
      remarks,
      items = []
    } = req.body

    // Validation
    if (!entry_date || !entry_type || !items.length) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Type-specific validation
    if (['Material Transfer'].includes(entry_type)) {
      if (!to_warehouse_id || !from_warehouse_id) {
        return res.status(400).json({ success: false, error: 'Both source and destination warehouses required' })
      }
    }

    if (['Material Receipt'].includes(entry_type)) {
      if (!to_warehouse_id) {
        return res.status(400).json({ success: false, error: 'Destination warehouse required for Material Receipt' })
      }
    }

    // Auto-generate entry number
    const entry_no = await StockEntryModel.generateEntryNo(entry_type)
    const userId = req.user?.id || 1

    const entry = await StockEntryModel.create({
      entry_no,
      entry_date,
      entry_type,
      from_warehouse_id,
      to_warehouse_id,
      purpose,
      reference_doctype,
      reference_name,
      remarks,
      created_by: userId,
      items
    })

    const isAutoSubmitEntry = reference_doctype === 'GRN' || entry_type === 'Material Receipt'
    
    if (isAutoSubmitEntry && entry.id) {
      try {
        const submittedEntry = await StockEntryModel.submit(entry.id, userId)
        res.status(201).json({ 
          success: true, 
          data: submittedEntry,
          message: 'Stock entry created and submitted successfully. Items added to stock balance.'
        })
      } catch (submitError) {
        console.error('Failed to auto-submit stock entry:', submitError)
        res.status(201).json({ 
          success: true, 
          data: entry,
          message: 'Stock entry created. Please submit manually.',
          warning: submitError.message
        })
      }
    } else {
      res.status(201).json({ success: true, data: entry })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateStockEntry = async (req, res) => {
  try {
    const { purpose, remarks } = req.body

    const updated = await StockEntryModel.update(req.params.id, {
      purpose,
      remarks,
      updated_by: req.user?.id
    })

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Stock entry not found' })
    }

    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const submitStockEntry = async (req, res) => {
  try {
    const submitted = await StockEntryModel.submit(req.params.id, req.user?.id)

    if (!submitted) {
      return res.status(404).json({ success: false, error: 'Stock entry not found' })
    }

    res.json({ success: true, data: submitted, message: 'Stock entry submitted successfully' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const cancelStockEntry = async (req, res) => {
  try {
    const cancelled = await StockEntryModel.cancel(req.params.id, req.user?.id)

    if (!cancelled) {
      return res.status(404).json({ success: false, error: 'Stock entry not found' })
    }

    res.json({ success: true, data: cancelled, message: 'Stock entry cancelled' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const deleteStockEntry = async (req, res) => {
  try {
    const deleted = await StockEntryModel.delete(req.params.id)

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Stock entry not found or cannot be deleted' })
    }

    res.json({ success: true, message: 'Stock entry deleted' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getNextEntryNumber = async (req, res) => {
  try {
    const { entryType } = req.query

    if (!entryType) {
      return res.status(400).json({ success: false, error: 'Entry type is required' })
    }

    const entryNo = await StockEntryModel.generateEntryNo(entryType)
    res.json({ success: true, data: { entry_no: entryNo } })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getStockEntryStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    // Get entries
    const filters = { startDate, endDate }
    const entries = await StockEntryModel.getAll(filters)

    // Calculate statistics
    const stats = {
      total_entries: entries.length,
      by_type: {},
      by_status: {},
      total_qty: 0,
      total_value: 0
    }

    entries.forEach(entry => {
      // By type
      if (!stats.by_type[entry.entry_type]) {
        stats.by_type[entry.entry_type] = 0
      }
      stats.by_type[entry.entry_type]++

      // By status
      if (!stats.by_status[entry.status]) {
        stats.by_status[entry.status] = 0
      }
      stats.by_status[entry.status]++

      // Totals
      stats.total_qty += entry.total_qty || 0
      stats.total_value += entry.total_value || 0
    })

    res.json({ success: true, data: stats })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}