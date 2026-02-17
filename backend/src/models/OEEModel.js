
class OEEModel {
  constructor(db) {
    this.db = db
  }

  _cleanFilters(filters) {
    const cleaned = { ...filters }
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === 'undefined' || cleaned[key] === 'null') {
        cleaned[key] = undefined
      }
    })
    return cleaned
  }

  /**
   * Calculate OEE metrics for a given set of parameters
   * @param {Object} filters - filters like startDate, endDate, machineId, lineId, workOrderId, shift
   */
  async getOEEMetrics(filters = {}) {
    const cleanedFilters = this._cleanFilters(filters)
    try {
      // Start with a base WHERE clause to ensure dynamic ANDs work correctly
      let whereClause = ' WHERE 1=1'
      
      const startDate = cleanedFilters.startDate || new Date().toISOString().split('T')[0]
      const endDate = cleanedFilters.endDate || new Date().toISOString().split('T')[0]
      const params = [startDate, endDate] // For the idle machine downtime subquery

      // Add conditions to the LEFT JOIN's ON clause to filter production entries
      // This MUST be part of the ON clause to keep all workstations in result
      let joinConditions = ''
      if (cleanedFilters.startDate) {
        joinConditions += ' AND pe.entry_date >= ?'
        params.push(cleanedFilters.startDate)
      }
      if (cleanedFilters.endDate) {
        joinConditions += ' AND pe.entry_date <= ?'
        params.push(cleanedFilters.endDate)
      }
      if (cleanedFilters.shift) {
        joinConditions += ' AND pe.shift_no = ?'
        params.push(cleanedFilters.shift)
      }
      if (cleanedFilters.workOrderId) {
        joinConditions += ' AND pe.work_order_id = ?'
        params.push(cleanedFilters.workOrderId)
      }

      // Re-build query with explicit ON conditions
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
          ) as ideal_cycle_time_mins,
          (
            SELECT COUNT(*)
            FROM job_card jc_count
            WHERE jc_count.machine_id = w.name
            AND jc_count.status = 'in-progress'
          ) as active_jobs
        FROM workstation w
        LEFT JOIN production_entry pe ON w.name = pe.machine_id ${joinConditions}
      `

      if (cleanedFilters.machineId) {
        whereClause += ' AND w.name = ?'
        params.push(cleanedFilters.machineId)
      }
      if (cleanedFilters.lineId) {
        whereClause += ' AND w.location = ?'
        params.push(cleanedFilters.lineId)
      }

      query += whereClause

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
          health: Number(Math.max(0, health).toFixed(1)),
          active_jobs: row.active_jobs || 0,
          bottleneck_score: (oee < 60 && row.active_jobs > 0) ? 100 : (oee < 75 ? 50 : 0)
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

    // Group by machine first to avoid skewing by number of production entries
    const machineGroups = data.reduce((acc, curr) => {
      const mid = curr.machine_id
      if (!acc[mid]) {
        acc[mid] = {
          availability: [], performance: [], quality: [], oee: [],
          total_units: 0, good_units: 0, rejected_units: 0, 
          downtime_mins: 0, operating_time_mins: 0
        }
      }
      acc[mid].availability.push(Number(curr.availability) || 0)
      acc[mid].performance.push(Number(curr.performance) || 0)
      acc[mid].quality.push(Number(curr.quality) || 0)
      acc[mid].oee.push(Number(curr.oee) || 0)
      acc[mid].total_units += Number(curr.total_units) || 0
      acc[mid].good_units += Number(curr.good_units) || 0
      acc[mid].rejected_units += Number(curr.rejected_units) || 0
      acc[mid].downtime_mins += Number(curr.downtime_mins) || 0
      acc[mid].operating_time_mins += Number(curr.operating_time_mins) || 0
      return acc
    }, {})

    const machineMetrics = Object.values(machineGroups).map(m => {
      const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      return {
        availability: avg(m.availability),
        performance: avg(m.performance),
        quality: avg(m.quality),
        oee: avg(m.oee),
        total_units: m.total_units,
        good_units: m.good_units,
        rejected_units: m.rejected_units,
        downtime_mins: m.downtime_mins,
        operating_time_mins: m.operating_time_mins
      }
    })

    const summary = machineMetrics.reduce((acc, curr) => {
      acc.availability += curr.availability
      acc.performance += curr.performance
      acc.quality += curr.quality
      acc.oee += curr.oee
      acc.total_units += curr.total_units
      acc.good_units += curr.good_units
      acc.rejected_units += curr.rejected_units
      acc.downtime_mins += curr.downtime_mins
      acc.operating_time_mins += curr.operating_time_mins
      return acc
    }, {
      availability: 0, performance: 0, quality: 0, oee: 0,
      total_units: 0, good_units: 0, rejected_units: 0,
      downtime_mins: 0, operating_time_mins: 0
    })

    const count = machineMetrics.length
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
        acc[date] = { 
          date, 
          oee: 0, 
          availability: 0, 
          performance: 0, 
          quality: 0, 
          working_time: 0, 
          downtime: 0, 
          total_units: 0,
          count: 0 
        }
      }
      acc[date].oee += curr.oee
      acc[date].availability += curr.availability
      acc[date].performance += curr.performance
      acc[date].quality += curr.quality
      acc[date].working_time += (curr.operating_time_mins || 0)
      acc[date].downtime += (curr.downtime_mins || 0)
      acc[date].total_units += (curr.total_units || 0)
      acc[date].count += 1
      return acc
    }, {})

    return Object.values(dailyTrends).map(t => ({
      date: t.date,
      oee: Number((t.oee / t.count).toFixed(2)),
      availability: Number((t.availability / t.count).toFixed(2)),
      performance: Number((t.performance / t.count).toFixed(2)),
      quality: Number((t.quality / t.count).toFixed(2)),
      working_time: Number(t.working_time.toFixed(2)),
      downtime: Number(t.downtime.toFixed(2)),
      total_units: t.total_units
    })).sort((a, b) => a.date.localeCompare(b.date))
  }

  async getDowntimeReasons(filters = {}) {
    const cleanedFilters = this._cleanFilters(filters)
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

      if (cleanedFilters.startDate) {
        query += ' AND DATE(de.created_at) >= ?'
        params.push(cleanedFilters.startDate)
      }
      if (cleanedFilters.endDate) {
        query += ' AND DATE(de.created_at) <= ?'
        params.push(cleanedFilters.endDate)
      }
      if (cleanedFilters.machineId) {
        query += ' AND w.name = ?'
        params.push(cleanedFilters.machineId)
      }
      if (cleanedFilters.lineId) {
        query += ' AND w.location = ?'
        params.push(cleanedFilters.lineId)
      }

      query += ' GROUP BY de.downtime_reason, w.location, w.name ORDER BY duration DESC'

      const [rows] = await this.db.query(query, params)
      return rows
    } catch (error) {
      throw error
    }
  }

  async getAllMachinesComprehensiveAnalysis(filters = {}) {
    try {
      const startDate = filters.startDate || (() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split('T')[0]
      })()
      const endDate = filters.endDate || new Date().toISOString().split('T')[0]

      const data = await this.getOEEMetrics({ ...filters, startDate, endDate })

      // Group by machine
      const machines = data.reduce((acc, curr) => {
        const mId = curr.machine_id
        if (!acc[mId]) {
          acc[mId] = {
            id: mId,
            name: curr.machine_name,
            type: curr.workstation_type,
            line: curr.line_id,
            status: curr.machine_status,
            total_produced: 0,
            total_rejected: 0,
            total_working_time: 0,
            total_downtime: 0,
            oee_sum: 0,
            oee_count: 0,
            daily: {},
            monthly: {}
          }
        }

        const m = acc[mId]
        if (curr.entry_date) {
          const date = curr.entry_date instanceof Date ? curr.entry_date.toISOString().split('T')[0] : new Date(curr.entry_date).toISOString().split('T')[0]
          const month = date.substring(0, 7)

          m.total_produced += curr.total_units
          m.total_rejected += curr.rejected_units
          m.total_working_time += curr.operating_time_mins
          m.total_downtime += (curr.downtime_mins || 0)
          m.oee_sum += curr.oee
          m.oee_count += 1

          // Daily
          if (!m.daily[date]) m.daily[date] = { date, produced: 0, rejected: 0, working: 0, downtime: 0, oee: 0, count: 0 }
          m.daily[date].produced += curr.total_units
          m.daily[date].rejected += curr.rejected_units
          m.daily[date].working += curr.operating_time_mins
          m.daily[date].downtime += (curr.downtime_mins || 0)
          m.daily[date].oee += curr.oee
          m.daily[date].count += 1

          // Monthly
          if (!m.monthly[month]) m.monthly[month] = { month, produced: 0, rejected: 0, working: 0, downtime: 0, oee: 0, count: 0 }
          m.monthly[month].produced += curr.total_units
          m.monthly[month].rejected += curr.rejected_units
          m.monthly[month].working += curr.operating_time_mins
          m.monthly[month].downtime += (curr.downtime_mins || 0)
          m.monthly[month].oee += curr.oee
          m.monthly[month].count += 1
        }
        return acc
      }, {})

      // Finalize metrics
      return Object.values(machines).map(m => {
        const avgOEE = m.oee_count > 0 ? (m.oee_sum / m.oee_count) : 0
        const totalTime = m.total_working_time + m.total_downtime
        
        return {
          ...m,
          oee: Number(avgOEE.toFixed(2)),
          downtime_rate: totalTime > 0 ? Number(((m.total_downtime / totalTime) * 100).toFixed(2)) : 0,
          working_hours: Number((m.total_working_time / 60).toFixed(2)),
          downtime_hours: Number((m.total_downtime / 60).toFixed(2)),
          daily: Object.values(m.daily).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ 
            ...d, 
            oee: Number((d.oee / d.count).toFixed(2)),
            downtime_rate: (d.working + d.downtime) > 0 ? Number(((d.downtime / (d.working + d.downtime)) * 100).toFixed(2)) : 0
          })),
          monthly: Object.values(m.monthly).sort((a, b) => a.month.localeCompare(b.month)).map(mo => ({ 
            ...mo, 
            oee: Number((mo.oee / mo.count).toFixed(2)),
            downtime_rate: (mo.working + mo.downtime) > 0 ? Number(((mo.downtime / (mo.working + mo.downtime)) * 100).toFixed(2)) : 0
          }))
        }
      })
    } catch (error) {
      throw error
    }
  }
}

export default OEEModel
