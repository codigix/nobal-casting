
import OEEModel from '../models/OEEModel.js'

class OEEController {
  constructor(db) {
    this.oeeModel = new OEEModel(db)
  }

  async getOEEDashboardData(req, res) {
    try {
      const filters = req.query
      
      const [summary, trends, downtimeReasons, machineOEE] = await Promise.all([
        this.oeeModel.getOEESummary(filters),
        this.oeeModel.getTrends(filters),
        this.oeeModel.getDowntimeReasons(filters),
        this.oeeModel.getOEEMetrics(filters)
      ])

      res.status(200).json({
        success: true,
        data: {
          summary,
          trends,
          downtimeReasons,
          machineOEE
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching OEE dashboard data',
        error: error.message
      })
    }
  }

  async getMachineOEE(req, res) {
    try {
      const { machine_id } = req.params
      const filters = { ...req.query, machineId: machine_id }
      
      const metrics = await this.oeeModel.getOEEMetrics(filters)
      
      res.status(200).json({
        success: true,
        data: metrics
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching machine OEE data',
        error: error.message
      })
    }
  }

  async getMachineHistoricalMetrics(req, res) {
    try {
      const { machine_id } = req.params
      // For historical, we might want last 90 days to cover all tabs
      const endDate = req.query.endDate || new Date().toISOString().split('T')[0]
      const startDate = req.query.startDate || (() => {
        const d = new Date()
        d.setDate(d.getDate() - 90)
        return d.toISOString().split('T')[0]
      })()

      const filters = { machineId: machine_id, startDate, endDate }
      
      const trends = await this.oeeModel.getTrends(filters)
      
      // Daily: Add mapped fields for legacy frontend compatibility
      const daily = trends.map(t => ({
        ...t,
        performance_percentage: t.performance,
        efficiency_percentage: t.oee
      }))

      // Weekly grouping
      const weeklyTrends = trends.reduce((acc, curr) => {
        const date = new Date(curr.date)
        const year = date.getFullYear()
        // Simple ISO week calculation
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1))
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
        const week = `${year}-W${weekNo}`
        
        if (!acc[week]) acc[week] = { week, performance: 0, oee: 0, count: 0 }
        acc[week].performance += curr.performance
        acc[week].oee += curr.oee
        acc[week].count += 1
        return acc
      }, {})

      // Monthly grouping
      const monthlyTrends = trends.reduce((acc, curr) => {
        const date = new Date(curr.date)
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!acc[month]) acc[month] = { month, performance: 0, oee: 0, count: 0 }
        acc[month].performance += curr.performance
        acc[month].oee += curr.oee
        acc[month].count += 1
        return acc
      }, {})

      res.status(200).json({
        success: true,
        data: {
          daily: daily,
          weekly: Object.values(weeklyTrends).map(w => ({
            week: w.week,
            avg_performance: Number((w.performance / w.count).toFixed(2)),
            avg_efficiency: Number((w.oee / w.count).toFixed(2))
          })),
          monthly: Object.values(monthlyTrends).map(m => ({
            month: m.month,
            avg_performance_percentage: Number((m.performance / m.count).toFixed(2)),
            avg_efficiency_percentage: Number((m.oee / m.count).toFixed(2))
          })),
          yearly: [] // Can implement if needed
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching machine historical OEE',
        error: error.message
      })
    }
  }
}

export default OEEController
