import WarehouseModel from '../models/WarehouseModel.js'

export const getAllWarehouses = async (req, res) => {
  try {
    const { department, isActive, warehouseType, search } = req.query
    const filters = {
      department: req.user?.department || 'all',
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      warehouseType,
      search
    }

    const warehouses = await WarehouseModel.getAll(filters)
    res.json({ success: true, data: warehouses, count: warehouses.length })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getWarehouse = async (req, res) => {
  try {
    const warehouse = await WarehouseModel.getById(req.params.id)
    if (!warehouse) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' })
    }

    // Check department access
    if (req.user?.department !== 'admin' && warehouse.department !== 'all' && warehouse.department !== req.user?.department) {
      return res.status(403).json({ success: false, error: 'Access denied' })
    }

    res.json({ success: true, data: warehouse })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const createWarehouse = async (req, res) => {
  try {
    const { warehouse_code, warehouse_name, warehouse_type, location, capacity, department } = req.body

    if (!warehouse_code || !warehouse_name || !warehouse_type) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    const warehouse = await WarehouseModel.create({
      warehouse_code,
      warehouse_name,
      warehouse_type,
      parent_warehouse_id: req.body.parent_warehouse_id || null,
      location,
      department: department || req.user?.department || 'all',
      capacity,
      created_by: req.user?.id
    })

    res.status(201).json({ success: true, data: warehouse })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateWarehouse = async (req, res) => {
  try {
    const { warehouse_name, warehouse_type, location, capacity, is_active } = req.body

    const warehouse = await WarehouseModel.update(req.params.id, {
      warehouse_name,
      warehouse_type,
      location,
      capacity,
      is_active,
      updated_by: req.user?.id
    })

    res.json({ success: true, data: warehouse })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const deleteWarehouse = async (req, res) => {
  try {
    const deleted = await WarehouseModel.delete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Warehouse not found' })
    }
    res.json({ success: true, message: 'Warehouse deleted' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getWarehouseHierarchy = async (req, res) => {
  try {
    const department = req.user?.department || 'all'
    const hierarchy = await WarehouseModel.getHierarchy(department)
    res.json({ success: true, data: hierarchy })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const getWarehouseCapacity = async (req, res) => {
  try {
    const capacity = await WarehouseModel.getCapacityUsage(req.params.id)
    res.json({ success: true, data: capacity })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}