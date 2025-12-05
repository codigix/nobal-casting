class ToolRoomModel {
  constructor(db) {
    this.db = db
  }

  // ============= TOOL MASTER =============

  async createTool(data) {
    try {
      const tool_id = `TOOL-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO tool_master 
        (tool_id, name, tool_type, item_code, location, status, purchase_date, cost, last_used_date, life_span_hours)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tool_id, data.name, data.tool_type, data.item_code, data.location, 
         data.status || 'active', data.purchase_date, data.cost, data.last_used_date, data.life_span_hours]
      )
      return { tool_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getTools(filters = {}) {
    try {
      let query = `SELECT * FROM tool_master WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND status = ?'
        params.push(filters.status)
      }
      if (filters.search) {
        query += ' AND (name LIKE ? OR tool_id LIKE ? OR item_code LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
      }
      if (filters.tool_type) {
        query += ' AND tool_type = ?'
        params.push(filters.tool_type)
      }

      query += ' ORDER BY created_at DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getTool(tool_id) {
    try {
      const [results] = await this.db.query(
        `SELECT * FROM tool_master WHERE tool_id = ?`,
        [tool_id]
      )
      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error
    }
  }

  async updateTool(tool_id, data) {
    try {
      let query = 'UPDATE tool_master SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ', updated_at = CURRENT_TIMESTAMP WHERE tool_id = ?'
      params.push(tool_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  async deleteTool(tool_id) {
    try {
      const [result] = await this.db.query(
        `DELETE FROM tool_master WHERE tool_id = ?`,
        [tool_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= DIE REGISTER =============

  async createDie(data) {
    try {
      const die_id = `DIE-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO die_register 
        (die_id, tool_id, drawing_number, supplier_id, purchase_date, purchase_cost, expected_life, cavities, material, status, work_order_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [die_id, data.tool_id, data.drawing_number, data.supplier_id, data.purchase_date,
         data.purchase_cost, data.expected_life, data.cavities, data.material, 
         data.status || 'active', 0]
      )
      return { die_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getDies(filters = {}) {
    try {
      let query = `SELECT d.*, t.name as tool_name 
                   FROM die_register d
                   LEFT JOIN tool_master t ON d.tool_id = t.tool_id
                   WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND d.status = ?'
        params.push(filters.status)
      }
      if (filters.search) {
        query += ' AND (d.die_id LIKE ? OR d.drawing_number LIKE ? OR t.name LIKE ?)'
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
      }

      query += ' ORDER BY d.created_at DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async getDie(die_id) {
    try {
      const [results] = await this.db.query(
        `SELECT d.*, t.name as tool_name FROM die_register d
         LEFT JOIN tool_master t ON d.tool_id = t.tool_id
         WHERE d.die_id = ?`,
        [die_id]
      )
      return results.length > 0 ? results[0] : null
    } catch (error) {
      throw error
    }
  }

  async updateDie(die_id, data) {
    try {
      let query = 'UPDATE die_register SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ', updated_at = CURRENT_TIMESTAMP WHERE die_id = ?'
      params.push(die_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  async incrementDieWorkOrderCount(die_id) {
    try {
      const [result] = await this.db.query(
        `UPDATE die_register SET work_order_count = work_order_count + 1 WHERE die_id = ?`,
        [die_id]
      )
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= DIE REWORK LOG =============

  async createRework(data) {
    try {
      const rework_id = `REW-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO die_rework_log 
        (rework_id, die_id, rework_date, rework_type, reason, cost, vendor_id, downtime_hours, completed_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [rework_id, data.die_id, data.rework_date, data.rework_type, data.reason,
         data.cost, data.vendor_id, data.downtime_hours, data.completed_date, data.status || 'pending']
      )
      return { rework_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getReworks(filters = {}) {
    try {
      let query = `SELECT r.*, d.drawing_number, t.name as tool_name
                   FROM die_rework_log r
                   LEFT JOIN die_register d ON r.die_id = d.die_id
                   LEFT JOIN tool_master t ON d.tool_id = t.tool_id
                   WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND r.status = ?'
        params.push(filters.status)
      }
      if (filters.die_id) {
        query += ' AND r.die_id = ?'
        params.push(filters.die_id)
      }
      if (filters.date_from) {
        query += ' AND DATE(r.rework_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(r.rework_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY r.rework_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async updateRework(rework_id, data) {
    try {
      let query = 'UPDATE die_rework_log SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ' WHERE rework_id = ?'
      params.push(rework_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= MAINTENANCE SCHEDULE =============

  async createMaintenanceSchedule(data) {
    try {
      const schedule_id = `MS-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO maintenance_schedule 
        (schedule_id, tool_id, maintenance_type, scheduled_date, interval_days, estimated_duration_hours, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [schedule_id, data.tool_id, data.maintenance_type, data.scheduled_date,
         data.interval_days, data.estimated_duration_hours, data.priority || 'medium', data.status || 'pending']
      )
      return { schedule_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getMaintenanceSchedules(filters = {}) {
    try {
      let query = `SELECT m.*, t.name as tool_name
                   FROM maintenance_schedule m
                   LEFT JOIN tool_master t ON m.tool_id = t.tool_id
                   WHERE 1=1`
      const params = []

      if (filters.status) {
        query += ' AND m.status = ?'
        params.push(filters.status)
      }
      if (filters.tool_id) {
        query += ' AND m.tool_id = ?'
        params.push(filters.tool_id)
      }
      if (filters.priority) {
        query += ' AND m.priority = ?'
        params.push(filters.priority)
      }

      query += ' ORDER BY m.scheduled_date ASC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  async updateMaintenanceSchedule(schedule_id, data) {
    try {
      let query = 'UPDATE maintenance_schedule SET '
      const params = []
      const fields = []

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`)
        params.push(value)
      })

      query += fields.join(', ')
      query += ' WHERE schedule_id = ?'
      params.push(schedule_id)

      const [result] = await this.db.query(query, params)
      return result.affectedRows > 0
    } catch (error) {
      throw error
    }
  }

  // ============= MAINTENANCE HISTORY =============

  async recordMaintenance(data) {
    try {
      const history_id = `MH-${Date.now()}`
      const [result] = await this.db.query(
        `INSERT INTO maintenance_history 
        (history_id, schedule_id, tool_id, maintenance_date, maintenance_type, performed_by_id, 
         duration_hours, cost, observations, next_maintenance_due)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [history_id, data.schedule_id, data.tool_id, data.maintenance_date, data.maintenance_type,
         data.performed_by_id, data.duration_hours, data.cost, data.observations, data.next_maintenance_due]
      )

      // Update tool's last maintenance date
      if (data.tool_id) {
        await this.db.query(
          `UPDATE tool_master SET last_maintenance_date = ? WHERE tool_id = ?`,
          [data.maintenance_date, data.tool_id]
        )
      }

      return { history_id, ...data }
    } catch (error) {
      throw error
    }
  }

  async getMaintenanceHistory(filters = {}) {
    try {
      let query = `SELECT m.*, t.name as tool_name
                   FROM maintenance_history m
                   LEFT JOIN tool_master t ON m.tool_id = t.tool_id
                   WHERE 1=1`
      const params = []

      if (filters.tool_id) {
        query += ' AND m.tool_id = ?'
        params.push(filters.tool_id)
      }
      if (filters.date_from) {
        query += ' AND DATE(m.maintenance_date) >= ?'
        params.push(filters.date_from)
      }
      if (filters.date_to) {
        query += ' AND DATE(m.maintenance_date) <= ?'
        params.push(filters.date_to)
      }

      query += ' ORDER BY m.maintenance_date DESC'
      const [results] = await this.db.query(query, params)
      return results
    } catch (error) {
      throw error
    }
  }

  // ============= ANALYTICS =============

  async getToolRoomDashboard() {
    try {
      const [toolStats] = await this.db.query(
        `SELECT 
          COUNT(*) as total_tools,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tools,
          SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as in_maintenance,
          SUM(CASE WHEN status = 'in_rework' THEN 1 ELSE 0 END) as in_rework
         FROM tool_master`
      )

      const [dieStats] = await this.db.query(
        `SELECT 
          COUNT(*) as total_dies,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_dies,
          SUM(CASE WHEN status = 'in_rework' THEN 1 ELSE 0 END) as in_rework_dies
         FROM die_register`
      )

      const [pendingMaintenance] = await this.db.query(
        `SELECT COUNT(*) as pending_maintenance
         FROM maintenance_schedule
         WHERE status = 'pending' AND scheduled_date <= CURDATE()`
      )

      const [recentReworks] = await this.db.query(
        `SELECT COUNT(*) as pending_reworks
         FROM die_rework_log
         WHERE status IN ('pending', 'in_progress')`
      )

      return {
        tools: toolStats[0] || {},
        dies: dieStats[0] || {},
        pending_maintenance: pendingMaintenance[0]?.pending_maintenance || 0,
        pending_reworks: recentReworks[0]?.pending_reworks || 0
      }
    } catch (error) {
      throw error
    }
  }

  async getDieUtilizationReport() {
    try {
      const [results] = await this.db.query(
        `SELECT 
          d.die_id,
          d.drawing_number,
          t.name as tool_name,
          d.expected_life,
          d.work_order_count,
          ROUND((d.work_order_count / d.expected_life) * 100, 2) as utilization_percentage,
          d.status
         FROM die_register d
         LEFT JOIN tool_master t ON d.tool_id = t.tool_id
         ORDER BY utilization_percentage DESC`
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getMaintenanceCostReport(date_from, date_to) {
    try {
      const [results] = await this.db.query(
        `SELECT 
          t.tool_id,
          t.name as tool_name,
          COUNT(*) as maintenance_count,
          SUM(m.cost) as total_cost,
          AVG(m.duration_hours) as avg_duration,
          MAX(m.maintenance_date) as last_maintenance
         FROM maintenance_history m
         JOIN tool_master t ON m.tool_id = t.tool_id
         WHERE DATE(m.maintenance_date) BETWEEN ? AND ?
         GROUP BY t.tool_id, t.name
         ORDER BY total_cost DESC`,
        [date_from, date_to]
      )
      return results
    } catch (error) {
      throw error
    }
  }

  async getDowntimeAnalysis() {
    try {
      const [results] = await this.db.query(
        `SELECT 
          d.die_id,
          d.drawing_number,
          SUM(r.downtime_hours) as total_downtime,
          COUNT(*) as rework_count,
          GROUP_CONCAT(DISTINCT r.rework_type) as rework_types
         FROM die_rework_log r
         JOIN die_register d ON r.die_id = d.die_id
         GROUP BY d.die_id, d.drawing_number
         ORDER BY total_downtime DESC`
      )
      return results
    } catch (error) {
      throw error
    }
  }
}

export default ToolRoomModel