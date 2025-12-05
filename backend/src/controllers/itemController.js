import { ItemModel } from '../models/ItemModel.js'

export async function createItem(req, res) {
  try {
    const db = req.app.locals.db
    const model = new ItemModel(db)

    const result = await model.create(req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getItem(req, res) {
  try {
    const db = req.app.locals.db
    const model = new ItemModel(db)

    const item = await model.getById(req.params.item_code)
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' })
    }

    res.json({ success: true, data: item })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function listItems(req, res) {
  try {
    const db = req.app.locals.db
    const model = new ItemModel(db)

    const filters = {
      item_group: req.query.item_group,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0
    }

    const items = await model.getAll(filters)
    res.json({ success: true, data: items })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getItemGroups(req, res) {
  try {
    const db = req.app.locals.db
    const model = new ItemModel(db)

    const groups = await model.getItemGroups()
    res.json({ success: true, data: groups })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function updateItem(req, res) {
  try {
    const db = req.app.locals.db
    const model = new ItemModel(db)

    const result = await model.update(req.params.item_code, req.body)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getItemStock(req, res) {
  try {
    const db = req.app.locals.db
    const model = new ItemModel(db)

    const totalStock = await model.getTotalStock(req.params.item_code)
    const stockByWarehouse = await model.getStockInfo(req.params.item_code)

    res.json({ success: true, data: { totalStock, stockByWarehouse } })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function deleteItem(req, res) {
  try {
    const db = req.app.locals.db
    const model = new ItemModel(db)

    const result = await model.delete(req.params.item_code)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}