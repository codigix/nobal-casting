class ProductionStageModel {
  static getDb() {
    return global.db
  }

  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = `
        SELECT * FROM production_stages
        WHERE 1=1
      `
      const params = []

      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?'
        params.push(filters.is_active ? 1 : 0)
      }

      if (filters.search) {
        query += ' AND (stage_code LIKE ? OR stage_name LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`)
      }

      query += ' ORDER BY stage_sequence ASC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch production stages: ${error.message}`)
    }
  }

  static async getById(id) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        'SELECT * FROM production_stages WHERE id = ?',
        [id]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch production stage: ${error.message}`)
    }
  }

  static async getByCode(stageCode) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        'SELECT * FROM production_stages WHERE stage_code = ?',
        [stageCode]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch production stage by code: ${error.message}`)
    }
  }

  static async create(data) {
    try {
      const db = this.getDb()
      const {
        stage_code,
        stage_name,
        stage_sequence,
        description,
        is_active = 1
      } = data

      if (!stage_code || !stage_name || stage_sequence === undefined) {
        throw new Error('Missing required fields: stage_code, stage_name, stage_sequence')
      }

      const [result] = await db.query(
        `INSERT INTO production_stages (
          stage_code, stage_name, stage_sequence, description, is_active
        ) VALUES (?, ?, ?, ?, ?)`,
        [stage_code, stage_name, stage_sequence, description || null, is_active]
      )

      return this.getById(result.insertId)
    } catch (error) {
      throw new Error(`Failed to create production stage: ${error.message}`)
    }
  }

  static async update(id, data) {
    try {
      const db = this.getDb()
      const fields = []
      const values = []

      if (data.stage_code) { fields.push('stage_code = ?'); values.push(data.stage_code) }
      if (data.stage_name) { fields.push('stage_name = ?'); values.push(data.stage_name) }
      if (data.stage_sequence !== undefined) { fields.push('stage_sequence = ?'); values.push(data.stage_sequence) }
      if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description) }
      if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0) }

      if (fields.length === 0) {
        throw new Error('No fields to update')
      }

      values.push(id)
      const query = `UPDATE production_stages SET ${fields.join(', ')} WHERE id = ?`
      await db.query(query, values)

      return this.getById(id)
    } catch (error) {
      throw new Error(`Failed to update production stage: ${error.message}`)
    }
  }

  static async delete(id) {
    try {
      const db = this.getDb()
      await db.query('DELETE FROM production_stages WHERE id = ?', [id])
      return { success: true, message: 'Production stage deleted successfully' }
    } catch (error) {
      throw new Error(`Failed to delete production stage: ${error.message}`)
    }
  }

  static async getActiveStages() {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        'SELECT * FROM production_stages WHERE is_active = 1 ORDER BY stage_sequence ASC'
      )
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch active production stages: ${error.message}`)
    }
  }
}

export default ProductionStageModel
