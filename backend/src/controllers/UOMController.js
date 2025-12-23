export class UOMController {
  static async getAll(req, res) {
    try {
      const { db } = req.app.locals
      const limit = Math.max(1, Math.min(10000, parseInt(req.query.limit, 10) || 1000))
      const offset = Math.max(0, parseInt(req.query.offset, 10) || 0)

      const [uoms] = await db.execute(
        `SELECT id, name, description, created_at FROM uom WHERE deleted_at IS NULL ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`
      )

      res.json({ success: true, data: uoms })
    } catch (error) {
      console.error('Error fetching UOM:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async getById(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      const [rows] = await db.execute(
        `SELECT * FROM uom WHERE id = ? AND deleted_at IS NULL`,
        [id]
      )

      if (!rows.length) {
        return res.status(404).json({ success: false, error: 'UOM not found' })
      }

      res.json({ success: true, data: rows[0] })
    } catch (error) {
      console.error('Error fetching UOM by ID:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async create(req, res) {
    try {
      const { db } = req.app.locals
      const { name, description } = req.body

      if (!name) {
        return res.status(400).json({ success: false, error: 'UOM name is required' })
      }

      await db.execute(
        `INSERT INTO uom (name, description) VALUES (?, ?)`,
        [name, description || null]
      )

      res.status(201).json({ success: true, data: { name, description } })
    } catch (error) {
      console.error('Error creating UOM:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async update(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params
      const { name, description } = req.body

      const [existing] = await db.execute(
        `SELECT id FROM uom WHERE id = ? AND deleted_at IS NULL`,
        [id]
      )

      if (!existing.length) {
        return res.status(404).json({ success: false, error: 'UOM not found' })
      }

      await db.execute(
        `UPDATE uom SET name = ?, description = ? WHERE id = ?`,
        [name, description || null, id]
      )

      res.json({ success: true, data: { id, name, description } })
    } catch (error) {
      console.error('Error updating UOM:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  static async delete(req, res) {
    try {
      const { db } = req.app.locals
      const { id } = req.params

      await db.execute(
        `UPDATE uom SET deleted_at = NOW() WHERE id = ?`,
        [id]
      )

      res.json({ success: true, message: 'UOM deleted successfully' })
    } catch (error) {
      console.error('Error deleting UOM:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
}
