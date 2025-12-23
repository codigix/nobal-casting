class MachinesController {
  static getDb() {
    const db = global.db
    if (!db) {
      console.error('[MachinesController] global.db is undefined!')
    }
    return db
  }

  static async getMachinesAnalysis(req, res) {
    try {
      const database = MachinesController.getDb()
      console.log('[getMachinesAnalysis] Database instance:', !!database)
      
      const [[{ total }]] = await database.query(
        `SELECT COUNT(*) as total FROM workstation WHERE is_active = 1`
      )
      console.log('[getMachinesAnalysis] Total:', total)
      
      const [statusCounts] = await database.query(
        `SELECT status, COUNT(*) as count FROM workstation WHERE is_active = 1 GROUP BY status`
      )
      console.log('[getMachinesAnalysis] StatusCounts:', statusCounts)
      
      const [analysisData] = await database.query(
        `SELECT 
          wa.id,
          wa.workstation_id,
          wa.workstation_name,
          wa.allocation_time,
          wa.downtime,
          wa.performance_percentage,
          wa.efficiency_percentage,
          wa.operations_assigned,
          wa.total_jobs,
          wa.completed_jobs,
          wa.rejection_rate,
          wa.last_maintenance_date,
          wa.next_maintenance_date,
          wa.uptime_hours,
          w.status,
          w.description,
          w.location,
          w.capacity_per_hour,
          w.workstation_type
         FROM workstation_analysis wa
         LEFT JOIN workstation w ON wa.workstation_id = w.id
         WHERE w.is_active = 1
         ORDER BY wa.workstation_name`
      )
      console.log('[getMachinesAnalysis] Analysis Records:', analysisData?.length || 0)
      
      const allMachines = (analysisData || []).map(data => ({
        id: data.workstation_id,
        name: data.workstation_name,
        status: data.status === 'active' ? 'Operational' : 'Maintenance',
        capacity: Math.round(data.efficiency_percentage) || 85,
        workload: Math.round((data.completed_jobs / data.total_jobs * 100)) || 80,
        allocation: Math.round(data.allocation_time) || 240,
        performance: Math.round(data.performance_percentage) || 85,
        errors: data.rejection_rate > 2 ? Math.ceil(data.rejection_rate) : 0,
        downtime: Math.round(data.downtime),
        lastMaintenance: data.last_maintenance_date ? new Date(data.last_maintenance_date).toLocaleDateString() : 'N/A',
        nextMaintenance: data.next_maintenance_date ? new Date(data.next_maintenance_date).toLocaleDateString() : 'N/A',
        description: data.description,
        location: data.location,
        operations: data.operations_assigned,
        totalJobs: data.total_jobs,
        completedJobs: data.completed_jobs,
        rejectionRate: data.rejection_rate,
        uptimeHours: Math.round(data.uptime_hours),
        efficiencyPercentage: Math.round(data.efficiency_percentage),
        capacityPerHour: data.capacity_per_hour,
        workstationType: data.workstation_type
      }))
      
      const [machineUtilization] = await database.query(
        `SELECT 
          wa.workstation_name as machine,
          ROUND((wa.completed_jobs / wa.total_jobs * 100), 2) as utilization,
          w.capacity_per_hour as capacity
         FROM workstation_analysis wa
         LEFT JOIN workstation w ON wa.workstation_id = w.id
         WHERE w.is_active = 1
         ORDER BY wa.workstation_name`
      )
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      const machineEfficiency = months.map((month) => ({
        month: month,
        efficiency: Math.floor(Math.random() * 30) + 70
      }))
      
      const [avgPerformanceResult] = await database.query(
        `SELECT ROUND(AVG(performance_percentage), 2) as avgPerformance FROM workstation_analysis`
      )
      
      const [avgUtilizationResult] = await database.query(
        `SELECT ROUND(AVG(uptime_hours), 2) as avgUtilization FROM workstation_analysis`
      )
      
      res.json({
        success: true,
        data: {
          total: parseInt(total) || 0,
          statusCounts: statusCounts || [],
          machines: allMachines || [],
          machineUtilization: machineUtilization || [],
          machineEfficiency: machineEfficiency || [],
          averagePerformance: avgPerformanceResult[0]?.avgPerformance || 0,
          averageUtilization: avgUtilizationResult[0]?.avgUtilization || 0
        },
        message: 'Machines analysis fetched successfully'
      })
    } catch (error) {
      console.error('[getMachinesAnalysis] ERROR:', error.message, error.stack)
      res.json({
        success: true,
        data: { 
          total: 0, 
          statusCounts: [], 
          machines: [], 
          machineUtilization: [],
          machineEfficiency: [],
          averagePerformance: 0,
          averageUtilization: 0
        },
        message: 'Machines analysis not available'
      })
    }
  }

  static async getWorkstationHistoricalMetrics(req, res) {
    try {
      const { id } = req.params
      const database = MachinesController.getDb()
      console.log('[getWorkstationHistoricalMetrics] Fetching metrics for workstation_id:', id)
      
      const [dailyMetrics] = await database.query(
        `SELECT 
          metric_date as date,
          allocation_time,
          downtime,
          jobs_completed,
          performance_percentage,
          efficiency_percentage,
          rejection_rate
         FROM workstation_daily_metrics
         WHERE workstation_id = ?
         ORDER BY metric_date DESC
         LIMIT 30`,
        [id]
      )
      console.log('[getWorkstationHistoricalMetrics] Daily metrics count:', dailyMetrics?.length || 0)

      const [weeklyData] = await database.query(
        `SELECT 
          DATE_FORMAT(metric_date, '%Y-W%u') as week,
          DATE(MIN(metric_date)) as start_date,
          ROUND(AVG(allocation_time), 2) as avg_allocation,
          ROUND(AVG(downtime), 2) as avg_downtime,
          SUM(jobs_completed) as total_jobs,
          ROUND(AVG(performance_percentage), 2) as avg_performance,
          ROUND(AVG(efficiency_percentage), 2) as avg_efficiency,
          ROUND(AVG(rejection_rate), 2) as avg_rejection
         FROM workstation_daily_metrics
         WHERE workstation_id = ?
         GROUP BY DATE_FORMAT(metric_date, '%Y-W%u')
         ORDER BY start_date DESC
         LIMIT 12`,
        [id]
      )

      const [monthlyMetrics] = await database.query(
        `SELECT 
          metric_month as month,
          total_allocation_time,
          total_downtime,
          total_jobs_completed,
          avg_performance_percentage,
          avg_efficiency_percentage,
          avg_rejection_rate
         FROM workstation_monthly_metrics
         WHERE workstation_id = ?
         ORDER BY metric_month DESC
         LIMIT 12`,
        [id]
      )

      const yearlyData = []
      for (let year = new Date().getFullYear(); year >= new Date().getFullYear() - 4; year--) {
        const [yearData] = await database.query(
          `SELECT 
            ? as year,
            ROUND(AVG(avg_performance_percentage), 2) as performance,
            ROUND(AVG(avg_efficiency_percentage), 2) as efficiency
           FROM workstation_monthly_metrics
           WHERE workstation_id = ? AND YEAR(STR_TO_DATE(metric_month, '%Y-%m')) = ?`,
          [year, id, year]
        )
        if (yearData.length > 0 && yearData[0].performance) {
          yearlyData.push(yearData[0])
        }
      }

      const response = {
        success: true,
        data: {
          daily: dailyMetrics.reverse(),
          weekly: weeklyData.reverse(),
          monthly: monthlyMetrics.reverse(),
          yearly: yearlyData
        },
        message: 'Historical metrics fetched successfully'
      }
      console.log('[getWorkstationHistoricalMetrics] Response summary:', {
        dailyCount: response.data.daily.length,
        weeklyCount: response.data.weekly.length,
        monthlyCount: response.data.monthly.length,
        yearlyCount: response.data.yearly.length
      })
      res.json(response)
    } catch (error) {
      console.error('Error fetching historical metrics:', error)
      res.status(500).json({ success: false, error: 'Failed to fetch historical metrics' })
    }
  }

  static async getMachineById(req, res) {
    try {
      const { id } = req.params
      const database = MachinesController.getDb()
      
      const [machines] = await database.query(
        `SELECT * FROM production_machines WHERE machine_id = ? AND deleted_at IS NULL`,
        [id]
      )
      
      if (machines.length === 0) {
        return res.status(404).json({ success: false, error: 'Machine not found' })
      }
      
      res.json({ success: true, data: machines[0] })
    } catch (error) {
      console.error('Error fetching machine:', error)
      res.status(500).json({ success: false, error: 'Failed to fetch machine' })
    }
  }

  static async updateMachine(req, res) {
    try {
      const { id } = req.params
      const updates = req.body
      const database = MachinesController.getDb()
      
      const allowedFields = ['status', 'workload', 'allocation', 'performance', 'errors', 'last_maintenance', 'total_operating_hours', 'maintenance_cycles', 'uptime_percentage']
      const updateFields = {}
      
      for (const field of allowedFields) {
        if (field in updates) {
          updateFields[field] = updates[field]
        }
      }
      
      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ success: false, error: 'No valid fields to update' })
      }
      
      const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ')
      const values = Object.values(updateFields)
      values.push(id)
      
      await database.query(
        `UPDATE production_machines SET ${setClauses}, updated_at = NOW() WHERE machine_id = ?`,
        values
      )
      
      res.json({ success: true, message: 'Machine updated successfully' })
    } catch (error) {
      console.error('Error updating machine:', error)
      res.status(500).json({ success: false, error: 'Failed to update machine' })
    }
  }
}

export default MachinesController
