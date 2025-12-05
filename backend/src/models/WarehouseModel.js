class WarehouseModel {
  static getDb() {
    return global.db
  }

  // Get all warehouses
  static async getAll(filters = {}) {
    try {
      const db = this.getDb()
      let query = 'SELECT * FROM warehouses WHERE 1=1'
      const params = []

      if (filters.department && filters.department !== 'all') {
        query += ' AND (department = ? OR department = "all")'
        params.push(filters.department)
      }

      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?'
        params.push(filters.isActive)
      }

      if (filters.warehouseType) {
        query += ' AND warehouse_type = ?'
        params.push(filters.warehouseType)
      }

      if (filters.search) {
        query += ' AND (warehouse_code LIKE ? OR warehouse_name LIKE ?)'
        const searchTerm = `%${filters.search}%`
        params.push(searchTerm, searchTerm)
      }

      query += ' ORDER BY warehouse_code ASC'

      const [rows] = await db.query(query, params)
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch warehouses: ${error.message}`)
    }
  }

  // Get warehouse by ID
  static async getById(id) {
    try {
      const db = this.getDb()
      const [rows] = await db.query('SELECT * FROM warehouses WHERE id = ?', [id])
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch warehouse: ${error.message}`)
    }
  }

  // Get warehouse by code
  static async getByCode(warehouseCode) {
    try {
      const db = this.getDb()
      const [rows] = await db.query('SELECT * FROM warehouses WHERE warehouse_code = ?', [warehouseCode])
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch warehouse: ${error.message}`)
    }
  }

  // Create warehouse
  static async create(data) {
    try {
      const db = this.getDb()
      const {
        warehouse_code,
        warehouse_name,
        warehouse_type,
        parent_warehouse_id,
        location,
        department,
        capacity,
        created_by
      } = data

      // Check if code already exists
      const existing = await this.getByCode(warehouse_code)
      if (existing) {
        throw new Error('Warehouse code already exists')
      }

      // Validate parent warehouse if provided
      if (parent_warehouse_id) {
        const parentWarehouse = await this.getById(parent_warehouse_id)
        if (!parentWarehouse) {
          throw new Error(`Parent warehouse with ID ${parent_warehouse_id} does not exist`)
        }
      }

      const [result] = await db.query(
        `INSERT INTO warehouses (
          warehouse_code, warehouse_name, warehouse_type, parent_warehouse_id, 
          location, department, capacity, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [warehouse_code, warehouse_name, warehouse_type, parent_warehouse_id || null, location, department, capacity, created_by]
      )

      return { id: result.insertId, ...data }
    } catch (error) {
      throw new Error(`Failed to create warehouse: ${error.message}`)
    }
  }

  // Update warehouse
  static async update(id, data) {
    try {
      const db = this.getDb()
      const { warehouse_name, warehouse_type, location, department, capacity, is_active, updated_by } = data

      await db.query(
        `UPDATE warehouses SET 
          warehouse_name = ?, warehouse_type = ?, location = ?, 
          department = ?, capacity = ?, is_active = ?, updated_by = ?
        WHERE id = ?`,
        [warehouse_name, warehouse_type, location, department, capacity, is_active, updated_by, id]
      )

      return await this.getById(id)
    } catch (error) {
      throw new Error(`Failed to update warehouse: ${error.message}`)
    }
  }

  // Delete warehouse
  static async delete(id) {
    try {
      const db = this.getDb()
      const [result] = await db.query('DELETE FROM warehouses WHERE id = ?', [id])
      return result.affectedRows > 0
    } catch (error) {
      throw new Error(`Failed to delete warehouse: ${error.message}`)
    }
  }

  // Get warehouses with hierarchy
  static async getHierarchy(department) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        `WITH RECURSIVE warehouse_tree AS (
          SELECT id, warehouse_code, warehouse_name, parent_warehouse_id, 0 as level, warehouse_type
          FROM warehouses
          WHERE parent_warehouse_id IS NULL AND (department = ? OR department = 'all')
          
          UNION ALL
          
          SELECT w.id, w.warehouse_code, w.warehouse_name, w.parent_warehouse_id, wt.level + 1, w.warehouse_type
          FROM warehouses w
          JOIN warehouse_tree wt ON w.parent_warehouse_id = wt.id
        )
        SELECT * FROM warehouse_tree
        ORDER BY level, warehouse_code`,
        [department]
      )
      return rows
    } catch (error) {
      throw new Error(`Failed to fetch warehouse hierarchy: ${error.message}`)
    }
  }

  // Get warehouse capacity usage
  static async getCapacityUsage(warehouseId) {
    try {
      const db = this.getDb()
      const [rows] = await db.query(
        `SELECT 
          w.id, w.warehouse_name, w.capacity,
          SUM(sb.current_qty) as current_qty,
          (SUM(sb.current_qty) / w.capacity * 100) as capacity_percentage
        FROM warehouses w
        LEFT JOIN stock_balance sb ON w.id = sb.warehouse_id
        WHERE w.id = ?
        GROUP BY w.id`,
        [warehouseId]
      )
      return rows[0] || null
    } catch (error) {
      throw new Error(`Failed to fetch warehouse capacity: ${error.message}`)
    }
  }
}

export default WarehouseModel