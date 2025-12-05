class ToolRoomController {
  constructor(toolRoomModel) {
    this.toolRoomModel = toolRoomModel
  }

  // ============= TOOL MASTER =============

  async createTool(req, res) {
    try {
      const { name, tool_type, item_code, location, purchase_date, cost, life_span_hours } = req.body

      // Validation
      if (!name || !tool_type || !location) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, tool_type, location'
        })
      }

      const tool = await this.toolRoomModel.createTool({
        name,
        tool_type,
        item_code,
        location,
        purchase_date,
        cost,
        life_span_hours
      })

      res.status(201).json({
        success: true,
        message: 'Tool created successfully',
        data: tool
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating tool',
        error: error.message
      })
    }
  }

  async getTools(req, res) {
    try {
      const { status, search, tool_type } = req.query

      const tools = await this.toolRoomModel.getTools({
        status,
        search,
        tool_type
      })

      res.status(200).json({
        success: true,
        data: tools,
        count: tools.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching tools',
        error: error.message
      })
    }
  }

  async getTool(req, res) {
    try {
      const { tool_id } = req.params

      const tool = await this.toolRoomModel.getTool(tool_id)

      if (!tool) {
        return res.status(404).json({
          success: false,
          message: 'Tool not found'
        })
      }

      res.status(200).json({
        success: true,
        data: tool
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching tool',
        error: error.message
      })
    }
  }

  async updateTool(req, res) {
    try {
      const { tool_id } = req.params
      const data = req.body

      const success = await this.toolRoomModel.updateTool(tool_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Tool not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Tool updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating tool',
        error: error.message
      })
    }
  }

  async deleteTool(req, res) {
    try {
      const { tool_id } = req.params

      const success = await this.toolRoomModel.deleteTool(tool_id)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Tool not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Tool deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting tool',
        error: error.message
      })
    }
  }

  // ============= DIE REGISTER =============

  async createDie(req, res) {
    try {
      const { tool_id, drawing_number, supplier_id, purchase_date, purchase_cost, expected_life, cavities, material } = req.body

      // Validation
      if (!tool_id || !drawing_number || !expected_life) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: tool_id, drawing_number, expected_life'
        })
      }

      const die = await this.toolRoomModel.createDie({
        tool_id,
        drawing_number,
        supplier_id,
        purchase_date,
        purchase_cost,
        expected_life,
        cavities,
        material
      })

      res.status(201).json({
        success: true,
        message: 'Die created successfully',
        data: die
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating die',
        error: error.message
      })
    }
  }

  async getDies(req, res) {
    try {
      const { status, search } = req.query

      const dies = await this.toolRoomModel.getDies({
        status,
        search
      })

      res.status(200).json({
        success: true,
        data: dies,
        count: dies.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dies',
        error: error.message
      })
    }
  }

  async getDie(req, res) {
    try {
      const { die_id } = req.params

      const die = await this.toolRoomModel.getDie(die_id)

      if (!die) {
        return res.status(404).json({
          success: false,
          message: 'Die not found'
        })
      }

      res.status(200).json({
        success: true,
        data: die
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching die',
        error: error.message
      })
    }
  }

  async updateDie(req, res) {
    try {
      const { die_id } = req.params
      const data = req.body

      const success = await this.toolRoomModel.updateDie(die_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Die not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Die updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating die',
        error: error.message
      })
    }
  }

  // ============= DIE REWORK =============

  async createRework(req, res) {
    try {
      const { die_id, rework_date, rework_type, reason, cost, vendor_id, downtime_hours, completed_date } = req.body

      // Validation
      if (!die_id || !rework_date || !rework_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: die_id, rework_date, rework_type'
        })
      }

      const rework = await this.toolRoomModel.createRework({
        die_id,
        rework_date,
        rework_type,
        reason,
        cost,
        vendor_id,
        downtime_hours,
        completed_date
      })

      res.status(201).json({
        success: true,
        message: 'Rework recorded successfully',
        data: rework
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording rework',
        error: error.message
      })
    }
  }

  async getReworks(req, res) {
    try {
      const { status, die_id, date_from, date_to } = req.query

      const reworks = await this.toolRoomModel.getReworks({
        status,
        die_id,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: reworks,
        count: reworks.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching reworks',
        error: error.message
      })
    }
  }

  async updateRework(req, res) {
    try {
      const { rework_id } = req.params
      const data = req.body

      const success = await this.toolRoomModel.updateRework(rework_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Rework not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Rework updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating rework',
        error: error.message
      })
    }
  }

  // ============= MAINTENANCE SCHEDULE =============

  async createMaintenanceSchedule(req, res) {
    try {
      const { tool_id, maintenance_type, scheduled_date, interval_days, estimated_duration_hours, priority } = req.body

      // Validation
      if (!tool_id || !maintenance_type || !scheduled_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: tool_id, maintenance_type, scheduled_date'
        })
      }

      const schedule = await this.toolRoomModel.createMaintenanceSchedule({
        tool_id,
        maintenance_type,
        scheduled_date,
        interval_days,
        estimated_duration_hours,
        priority
      })

      res.status(201).json({
        success: true,
        message: 'Maintenance schedule created successfully',
        data: schedule
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating maintenance schedule',
        error: error.message
      })
    }
  }

  async getMaintenanceSchedules(req, res) {
    try {
      const { status, tool_id, priority } = req.query

      const schedules = await this.toolRoomModel.getMaintenanceSchedules({
        status,
        tool_id,
        priority
      })

      res.status(200).json({
        success: true,
        data: schedules,
        count: schedules.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching maintenance schedules',
        error: error.message
      })
    }
  }

  async updateMaintenanceSchedule(req, res) {
    try {
      const { schedule_id } = req.params
      const data = req.body

      const success = await this.toolRoomModel.updateMaintenanceSchedule(schedule_id, data)

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        })
      }

      res.status(200).json({
        success: true,
        message: 'Schedule updated successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating schedule',
        error: error.message
      })
    }
  }

  // ============= MAINTENANCE HISTORY =============

  async recordMaintenance(req, res) {
    try {
      const { schedule_id, tool_id, maintenance_date, maintenance_type, performed_by_id, duration_hours, cost, observations, next_maintenance_due } = req.body

      // Validation
      if (!tool_id || !maintenance_date || !maintenance_type) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: tool_id, maintenance_date, maintenance_type'
        })
      }

      const history = await this.toolRoomModel.recordMaintenance({
        schedule_id,
        tool_id,
        maintenance_date,
        maintenance_type,
        performed_by_id,
        duration_hours,
        cost,
        observations,
        next_maintenance_due
      })

      res.status(201).json({
        success: true,
        message: 'Maintenance recorded successfully',
        data: history
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error recording maintenance',
        error: error.message
      })
    }
  }

  async getMaintenanceHistory(req, res) {
    try {
      const { tool_id, date_from, date_to } = req.query

      const history = await this.toolRoomModel.getMaintenanceHistory({
        tool_id,
        date_from,
        date_to
      })

      res.status(200).json({
        success: true,
        data: history,
        count: history.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching maintenance history',
        error: error.message
      })
    }
  }

  // ============= ANALYTICS =============

  async getDashboard(req, res) {
    try {
      const dashboard = await this.toolRoomModel.getToolRoomDashboard()

      res.status(200).json({
        success: true,
        data: dashboard
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard',
        error: error.message
      })
    }
  }

  async getDieUtilization(req, res) {
    try {
      const report = await this.toolRoomModel.getDieUtilizationReport()

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching utilization report',
        error: error.message
      })
    }
  }

  async getMaintenanceCosts(req, res) {
    try {
      const { date_from, date_to } = req.query

      if (!date_from || !date_to) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: date_from, date_to'
        })
      }

      const report = await this.toolRoomModel.getMaintenanceCostReport(date_from, date_to)

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching maintenance cost report',
        error: error.message
      })
    }
  }

  async getDowntimeAnalysis(req, res) {
    try {
      const report = await this.toolRoomModel.getDowntimeAnalysis()

      res.status(200).json({
        success: true,
        data: report,
        count: report.length
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching downtime analysis',
        error: error.message
      })
    }
  }
}

export default ToolRoomController