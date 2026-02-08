
class OEEModel {
  constructor(db) {
    this.db = db
  }

  /**
   * Calculate OEE metrics for a given set of parameters
   * @param {Object} filters - filters like startDate, endDate, machineId, lineId, workOrderId, shift
   */
  async getOEEMetrics(filters = {}) {
    try {
      let query = `
        SELECT 
          w.workstation_name as machine_name,
          w.name as machine_id,
          w.location as line_id,
          w.status as machine_status,
          w.workstation_type,
          pe.entry_date,
          pe.shift_no,
          pe.work_order_id,
          COALESCE(pe.quantity_produced, 0) as total_units,
          COALESCE(pe.quantity_rejected, 0) as rejected_units,
          (COALESCE(pe.quantity_produced, 0) - COALESCE(pe.quantity_rejected, 0)) as good_units,
          COALESCE(pe.hours_worked, 0) * 60 as operating_time_mins,
          (
            SELECT SUM(duration_minutes) 
            FROM downtime_entry de 
            JOIN job_card jc_de ON de.job_card_id = jc_de.job_card_id
            WHERE jc_de.machine_id = w.name 
            AND (
              (pe.entry_date IS NOT NULL AND DATE(de.created_at) = pe.entry_date)
              OR 
              (pe.entry_date IS NULL AND DATE(de.created_at) BETWEEN ? AND ?)
            )
          ) as downtime_mins,
          (
            SELECT COALESCE(AVG(operation_time), 1)
            FROM job_card jc
            WHERE jc.work_order_id = pe.work_order_id 
            AND jc.machine_id = w.name
          ) as ideal_cycle_time_mins
        FROM workstation w
        LEFT JOIN production_entry pe ON w.name = pe.machine_id
      `
      const params = []
      const startDate = filters.startDate || new Date().toISOString().split('T')[0]
      const endDate = filters.endDate || new Date().toISOString().split('T')[0]
      
      params.push(startDate, endDate) // For the idle machine downtime subquery

      let whereClause = ''
      if (filters.startDate) {
        whereClause += ' AND pe.entry_date >= ?'
        params.push(filters.startDate)
      }
      if (filters.endDate) {
        whereClause += ' AND pe.entry_date <= ?'
        params.push(filters.endDate)
      }
      if (filters.machineId) {
        whereClause += ' AND w.name = ?'
        params.push(filters.machineId)
      }
      if (filters.lineId) {
        whereClause += ' AND w.location = ?'
        params.push(filters.lineId)
      }
      if (filters.workOrderId) {
        whereClause += ' AND pe.work_order_id = ?'
        params.push(filters.workOrderId)
      }
      if (filters.shift) {
        whereClause += ' AND pe.shift_no = ?'
        params.push(filters.shift)
      }

      if (whereClause) {
        query += ' WHERE 1=1' + whereClause
      }

      const [rows] = await this.db.query(query, params)

      // Default planned time per shift (8 hours = 480 mins)
      const PLANNED_TIME_PER_SHIFT = 480

      const processedData = rows.map(row => {
        const downtime = row.downtime_mins || 0
        // If we have hours_worked from production_entry, use it. Otherwise, assume based on planned time.
        const operatingTime = row.entry_date ? (row.operating_time_mins || 0) : (PLANNED_TIME_PER_SHIFT - downtime)
        const totalUnits = row.total_units || 0
        const goodUnits = row.good_units || 0
        const idealCycleTime = row.ideal_cycle_time_mins || 1

        // Availability = Operating Time / Planned Production Time
        // For actual production entries, we use (Operating Time + Downtime) as the denominator if it's more than PLANNED_TIME_PER_SHIFT (overtime)
        const plannedTime = Math.max(PLANNED_TIME_PER_SHIFT, (row.operating_time_mins || 0) + downtime)
        const availability = plannedTime > 0 
          ? (operatingTime / plannedTime) * 100 
          : 0

        // Performance = (Ideal Cycle Time × Total Units) / Operating Time
        const performance = operatingTime > 0 
          ? ((idealCycleTime * totalUnits) / operatingTime) * 100 
          : 0

        // Quality = Good Units / Total Units
        const quality = totalUnits > 0 
          ? (goodUnits / totalUnits) * 100 
          : 0

        // OEE = Availability × Performance × Quality
        const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100

        // Map telemetry values based on production data
        const load = performance > 0 ? performance : 0
        const temperature = row.entry_date ? (25 + (performance * 0.4) + (Math.random() * 5)) : 22
        
        let health = 100
        if (row.machine_status === 'Down') health = 45
        else if (row.machine_status === 'Maintenance') health = 75
        else {
          // Reduce health slightly based on rejection rate
          const rejectionRate = totalUnits > 0 ? (row.rejected_units / totalUnits) * 100 : 0
          health = 100 - (rejectionRate * 0.5)
        }

        return {
          ...row,
          availability: Math.min(availability, 100),
          performance: Math.min(performance, 100),
          quality: Math.min(quality, 100),
          oee: Math.min(oee, 100),
          load: Number(load.toFixed(1)),
          temperature: Number(temperature.toFixed(1)),
          health: Number(Math.max(0, health).toFixed(1))
        }
      })

      return processedData
    } catch (error) {
      throw error
    }
  }

  async getOEESummary(filters = {}) {
    const data = await this.getOEEMetrics(filters)
    
    if (data.length === 0) {
      return {
        availability: 0,
        performance: 0,
        quality: 0,
        oee: 0,
        total_units: 0,
        good_units: 0,
        rejected_units: 0,
        downtime_mins: 0,
        operating_time_mins: 0
      }
    }

    const summary = data.reduce((acc, curr) => {
      acc.availability += Number(curr.availability) || 0
      acc.performance += Number(curr.performance) || 0
      acc.quality += Number(curr.quality) || 0
      acc.oee += Number(curr.oee) || 0
      acc.total_units += Number(curr.total_units) || 0
      acc.good_units += Number(curr.good_units) || 0
      acc.rejected_units += Number(curr.rejected_units) || 0
      acc.downtime_mins += Number(curr.downtime_mins) || 0
      acc.operating_time_mins += Number(curr.operating_time_mins) || 0
      return acc
    }, {
      availability: 0,
      performance: 0,
      quality: 0,
      oee: 0,
      total_units: 0,
      good_units: 0,
      rejected_units: 0,
      downtime_mins: 0,
      operating_time_mins: 0
    })

    const count = data.length
    return {
      availability: Number((summary.availability / count).toFixed(2)),
      performance: Number((summary.performance / count).toFixed(2)),
      quality: Number((summary.quality / count).toFixed(2)),
      oee: Number((summary.oee / count).toFixed(2)),
      total_units: summary.total_units,
      good_units: summary.good_units,
      rejected_units: summary.rejected_units,
      downtime_mins: summary.downtime_mins,
      operating_time_mins: summary.operating_time_mins
    }
  }

  async getTrends(filters = {}) {
    const data = await this.getOEEMetrics(filters)
    
    // Group by date, filtering out entries without an entry_date (idle machines)
    const dailyTrends = data.reduce((acc, curr) => {
      if (!curr.entry_date) return acc
      
      const date = curr.entry_date instanceof Date 
        ? curr.entry_date.toISOString().split('T')[0]
        : new Date(curr.entry_date).toISOString().split('T')[0]
        
      if (!acc[date]) {
        acc[date] = { date, oee: 0, availability: 0, performance: 0, quality: 0, count: 0 }
      }
      acc[date].oee += curr.oee
      acc[date].availability += curr.availability
      acc[date].performance += curr.performance
      acc[date].quality += curr.quality
      acc[date].count += 1
      return acc
    }, {})

    return Object.values(dailyTrends).map(t => ({
      date: t.date,
      oee: Number((t.oee / t.count).toFixed(2)),
      availability: Number((t.availability / t.count).toFixed(2)),
      performance: Number((t.performance / t.count).toFixed(2)),
      quality: Number((t.quality / t.count).toFixed(2))
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  async getDowntimeReasons(filters = {}) {
    try {
      let query = `
        SELECT 
          de.downtime_reason as reason,
          w.location as line_id,
          w.name as machine_id,
          SUM(de.duration_minutes) as duration,
          COUNT(*) as occurrences
        FROM downtime_entry de
        JOIN job_card jc ON de.job_card_id = jc.job_card_id
        JOIN workstation w ON jc.machine_id = w.name
        WHERE 1=1
      `
      const params = []

      if (filters.startDate) {
        query += ' AND DATE(de.created_at) >= ?'
        params.push(filters.startDate)
      }
      if (filters.endDate) {
        query += ' AND DATE(de.created_at) <= ?'
        params.push(filters.endDate)
      }
      if (filters.machineId) {
        query += ' AND w.name = ?'
        params.push(filters.machineId)
      }
      if (filters.lineId) {
        query += ' AND w.location = ?'
        params.push(filters.lineId)
      }

      query += ' GROUP BY de.downtime_reason, w.location, w.name ORDER BY duration DESC'

      const [rows] = await this.db.query(query, params)
      return rows
    } catch (error) {
      throw error
    }
  }
}

export default OEEModel
