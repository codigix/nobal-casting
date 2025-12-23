export async function getAll(req, res) {
  try {
    const db = req.app.locals.db
    
    const [groups] = await db.execute(
      `SELECT id, name, description, created_at, updated_at FROM item_group WHERE deleted_at IS NULL ORDER BY name`
    )
    
    res.json({ success: true, data: groups })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function getById(req, res) {
  try {
    const db = req.app.locals.db
    const { id } = req.params
    
    const [groups] = await db.execute(
      `SELECT id, name, description, created_at, updated_at FROM item_group WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )
    
    if (groups.length === 0) {
      return res.status(404).json({ success: false, error: 'Item group not found' })
    }
    
    res.json({ success: true, data: groups[0] })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function create(req, res) {
  try {
    const db = req.app.locals.db
    const { name, description } = req.body
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }
    
    await db.execute(
      `INSERT INTO item_group (name, description) VALUES (?, ?)`,
      [name, description || null]
    )
    
    res.status(201).json({ success: true, message: 'Item group created successfully' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Item group already exists' })
    }
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function update(req, res) {
  try {
    const db = req.app.locals.db
    const { id } = req.params
    const { name, description } = req.body
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Name is required' })
    }
    
    const [result] = await db.execute(
      `UPDATE item_group SET name = ?, description = ?, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [name, description || null, id]
    )
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Item group not found' })
    }
    
    res.json({ success: true, message: 'Item group updated successfully' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, error: 'Item group already exists' })
    }
    res.status(400).json({ success: false, error: error.message })
  }
}

export async function deleteItemGroup(req, res) {
  try {
    const db = req.app.locals.db
    const { id } = req.params
    
    const [result] = await db.execute(
      `UPDATE item_group SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      [id]
    )
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Item group not found' })
    }
    
    res.json({ success: true, message: 'Item group deleted successfully' })
  } catch (error) {
    res.status(400).json({ success: false, error: error.message })
  }
}
