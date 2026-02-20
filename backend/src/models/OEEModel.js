
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
      let whereClause = ' WHERE 1=1'
      const params = []
      
      const startDate = cleanedFilters.startDate || new Date().toISOString().split('T')[0]
      const endDate = cleanedFilters.endDate || new Date().toISOString().split('T')[0]

      let query = `
        SELECT 
          w.workstation_name as machine_name,
          w.name as machine_id,
          w.location as line_id,
          w.status as machine_status,
          w.workstation_type,
          oa.log_date as entry_date,
          oa.shift as shift_no,
          NULL as work_order_id,
          COALESCE(oa.total_produced_qty, 0) as total_units,
          COALESCE(oa.total_produced_qty - oa.accepted_qty, 0) as rejected_units,
          COALESCE(oa.accepted_qty, 0) as good_units,
          COALESCE(oa.actual_run_time, 0) as operating_time_mins,
          COALESCE(oa.downtime, 0) as downtime_mins,
          COALESCE(oa.ideal_cycle_time, 1) as ideal_cycle_time_mins,
          oa.availability,
          oa.performance,
          oa.quality,
          oa.oee,
          (
            SELECT COUNT(*)
            FROM job_card jc_count
            WHERE jc_count.machine_id = w.name
            AND jc_count.status = 'in-progress'
          ) as active_jobs
        FROM workstation w
        LEFT JOIN oee_analysis oa ON w.name = oa.reference_id AND oa.level = 'workstation'
      `

      if (cleanedFilters.startDate) {
        query += ' AND oa.log_date >= ?'
        params.push(cleanedFilters.startDate)
      }
      if (cleanedFilters.endDate) {
        query += ' AND oa.log_date <= ?'
        params.push(cleanedFilters.endDate)
      }
      if (cleanedFilters.shift && cleanedFilters.shift !== 'All Shifts') {
        // Since workstation OEE is All Day, we might need to handle shift filters differently
        // If they filter by shift, we might want to show job_card level OEE or just filter the workstation records if they are shift-based
        query += ' AND (oa.shift = ? OR oa.shift = "All Day")'
        params.push(cleanedFilters.shift)
      }

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

      const processedData = rows.map(row => {
        const oee = parseFloat(row.oee || 0)
        const performance = parseFloat(row.performance || 0)
        
        // Map telemetry values based on production data
        const load = performance > 0 ? performance : 0
        const temperature = row.entry_date ? (25 + (performance * 0.4) + (Math.random() * 5)) : 22
        
        let health = 100
        if (row.machine_status === 'Down') health = 45
        else if (row.machine_status === 'Maintenance') health = 75
        else {
          // Reduce health slightly based on rejection rate
          const totalUnits = parseFloat(row.total_units || 0)
          const rejectedUnits = parseFloat(row.rejected_units || 0)
          const rejectionRate = totalUnits > 0 ? (rejectedUnits / totalUnits) * 100 : 0
          health = 100 - (rejectionRate * 0.5)
        }

        return {
          ...row,
          availability: Math.min(parseFloat(row.availability || 0), 100),
          performance: Math.min(performance, 100),
          quality: Math.min(parseFloat(row.quality || 0), 100),
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

  /**
   * Calculate and save OEE for a Job Card on a specific date and shift
   */
  async calculateAndSaveJobCardOEE(jobCardId, logDate, shift) {
    try {
      // 1. Get Job Card and BOM Ideal Cycle Time
      // We look for operation_time in bom_operation or job_card itself
      const [jcRows] = await this.db.query(`
        SELECT jc.*, bo.operation_time as bom_ideal_cycle_time
        FROM job_card jc
        LEFT JOIN work_order wo ON jc.work_order_id = wo.wo_id
        LEFT JOIN bom_operation bo ON wo.bom_no = bo.bom_id AND jc.operation = bo.operation_name
        WHERE jc.job_card_id = ?
      `, [jobCardId]);
      
      if (jcRows.length === 0) return null;
      const jobCard = jcRows[0];
      const idealCycleTime = parseFloat(jobCard.bom_ideal_cycle_time || jobCard.operation_time || 1);

      // 2. Get Production and Time Logs for this shift
      const [timeLogs] = await this.db.query(`
        SELECT SUM(time_in_minutes) as actual_time, 
               SUM(completed_qty) as total_produced,
               SUM(accepted_qty) as total_accepted
        FROM time_log
        WHERE job_card_id = ? AND (DATE(log_date) = ? OR log_date = ?) AND shift = ?
      `, [jobCardId, logDate, logDate, shift]);
      
      const stats = timeLogs[0];
      let totalProduced = parseFloat(stats.total_produced || 0);
      let totalAccepted = parseFloat(stats.total_accepted || 0);

      // 2a. Incorporate Quality Inspection Entries for higher accuracy
      const [inspectionLogs] = await this.db.query(`
        SELECT SUM(quantity_inspected) as total_inspected,
               SUM(quantity_passed) as total_passed
        FROM inspection_result
        WHERE reference_type = 'Job Card' AND reference_id = ? 
        AND (DATE(inspection_date) = ? OR inspection_date = ?)
      `, [jobCardId, logDate, logDate]);

      if (inspectionLogs[0] && inspectionLogs[0].total_inspected > 0) {
        totalAccepted = parseFloat(inspectionLogs[0].total_passed || 0);
        totalProduced = Math.max(totalProduced, parseFloat(inspectionLogs[0].total_inspected || 0));
      }

      // 3. Get Downtime for this shift
      const [downtimes] = await this.db.query(`
        SELECT downtime_type, downtime_reason, SUM(duration_minutes) as duration
        FROM downtime_entry
        WHERE job_card_id = ? AND (DATE(log_date) = ? OR log_date = ?) AND shift = ?
        GROUP BY downtime_type, downtime_reason
      `, [jobCardId, logDate, logDate, shift]);

      // NEW: Check if there's ANY data at all for this shift. If not, delete the OEE analysis entry and return.
      if (totalProduced === 0 && totalAccepted === 0 && (downtimes.length === 0 || downtimes.every(d => parseFloat(d.duration) === 0))) {
        await this.db.query(`
          DELETE FROM oee_analysis 
          WHERE level = 'job_card' AND reference_id = ? AND log_date = ? AND shift = ?
        `, [jobCardId, logDate, shift]);
        
        // Still need to trigger parent aggregations because this might have been the last record
        if (jobCard.work_order_id) {
          await this.calculateAndSaveWorkOrderOEE(jobCard.work_order_id, logDate);
        }
        if (jobCard.machine_id) {
          await this.calculateAndSaveWorkstationOEE(jobCard.machine_id, logDate);
        }
        return null;
      }

      let totalDowntime = 0;
      let availabilityLoss = 0;
      let performanceLoss = 0;
      
      downtimes.forEach(dt => {
        const duration = parseFloat(dt.duration || 0);
        totalDowntime += duration;
        
        // Categorize losses as per requirements:
        // Availability Loss: breakdowns, setup time, waiting
        // Performance Loss: minor stops, slow cycles
        const type = (dt.downtime_type || '').toLowerCase();
        const reason = (dt.downtime_reason || '').toLowerCase();
        
        if (type.includes('breakdown') || type.includes('setup') || type.includes('waiting') || 
            reason.includes('breakdown') || reason.includes('setup') || reason.includes('waiting')) {
          availabilityLoss += duration;
        } else if (type.includes('minor') || type.includes('slow') || type.includes('speed') ||
                   reason.includes('minor') || reason.includes('slow') || reason.includes('speed')) {
          performanceLoss += duration;
        } else {
          // Default to availability loss for generic categories
          availabilityLoss += duration;
        }
      });

      // 4. Constants and Formulas
      const PLANNED_PRODUCTION_TIME = 480; // Standard 8 hour shift
      
      // Validation Rule: downtime <= planned_time
      const effectiveDowntime = Math.min(totalDowntime, PLANNED_PRODUCTION_TIME);
      const actualRunTime = Math.max(0, PLANNED_PRODUCTION_TIME - effectiveDowntime);
      
      // Validation Rule: produced_qty >= accepted_qty
      const effectiveAccepted = Math.min(totalAccepted, totalProduced);

      // Availability = (Planned Production Time − Downtime) ÷ Planned Production Time
      const availability = PLANNED_PRODUCTION_TIME > 0 
        ? ((PLANNED_PRODUCTION_TIME - effectiveDowntime) / PLANNED_PRODUCTION_TIME) * 100 
        : 0;

      // Performance = (Ideal Cycle Time × Total Produced Quantity) ÷ Actual Run Time
      const performance = (actualRunTime > 0 && totalProduced > 0)
        ? ((idealCycleTime * totalProduced) / actualRunTime) * 100
        : 0;

      // Quality = Accepted Quantity ÷ Total Produced Quantity
      const quality = totalProduced > 0
        ? (effectiveAccepted / totalProduced) * 100
        : 0;

      // Final OEE = Availability × Performance × Quality
      const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

      // 5. Save results
      const oeeData = {
        level: 'job_card',
        reference_id: jobCardId,
        log_date: logDate,
        shift: shift,
        availability: Math.min(100, Math.max(0, availability)),
        performance: Math.min(100, Math.max(0, performance)),
        quality: Math.min(100, Math.max(0, quality)),
        oee: Math.min(100, Math.max(0, oee)),
        planned_production_time: PLANNED_PRODUCTION_TIME,
        downtime: effectiveDowntime,
        actual_run_time: actualRunTime,
        ideal_cycle_time: idealCycleTime,
        total_produced_qty: totalProduced,
        accepted_qty: effectiveAccepted,
        availability_loss: availabilityLoss,
        performance_loss: performanceLoss,
        quality_loss_qty: Math.max(0, totalProduced - effectiveAccepted)
      };

      await this.db.query(`
        INSERT INTO oee_analysis (
          level, reference_id, log_date, shift, availability, performance, quality, oee,
          planned_production_time, downtime, actual_run_time, ideal_cycle_time,
          total_produced_qty, accepted_qty, availability_loss, performance_loss, quality_loss_qty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          availability = VALUES(availability),
          performance = VALUES(performance),
          quality = VALUES(quality),
          oee = VALUES(oee),
          planned_production_time = VALUES(planned_production_time),
          downtime = VALUES(downtime),
          actual_run_time = VALUES(actual_run_time),
          ideal_cycle_time = VALUES(ideal_cycle_time),
          total_produced_qty = VALUES(total_produced_qty),
          accepted_qty = VALUES(accepted_qty),
          availability_loss = VALUES(availability_loss),
          performance_loss = VALUES(performance_loss),
          quality_loss_qty = VALUES(quality_loss_qty)
      `, Object.values(oeeData));

      // After calculating job card OEE, trigger aggregation for Work Order and Workstation
      if (jobCard.work_order_id) {
        await this.calculateAndSaveWorkOrderOEE(jobCard.work_order_id, logDate);
      }
      if (jobCard.machine_id) {
        await this.calculateAndSaveWorkstationOEE(jobCard.machine_id, logDate);
      }

      return oeeData;
    } catch (error) {
      console.error('Error calculating Job Card OEE:', error);
      throw error;
    }
  }

  /**
   * Calculate aggregated OEE for a Work Order (weighted average)
   */
  async calculateAndSaveWorkOrderOEE(workOrderId, logDate) {
    try {
      const [rows] = await this.db.query(`
        SELECT 
          SUM(availability * actual_run_time) / NULLIF(SUM(actual_run_time), 0) as weighted_availability,
          SUM(performance * actual_run_time) / NULLIF(SUM(actual_run_time), 0) as weighted_performance,
          SUM(quality * actual_run_time) / NULLIF(SUM(actual_run_time), 0) as weighted_quality,
          SUM(planned_production_time) as total_planned,
          SUM(downtime) as total_downtime,
          SUM(actual_run_time) as total_run_time,
          SUM(total_produced_qty) as total_produced,
          SUM(accepted_qty) as total_accepted,
          SUM(availability_loss) as total_avail_loss,
          SUM(performance_loss) as total_perf_loss,
          SUM(quality_loss_qty) as total_qual_loss
        FROM oee_analysis
        WHERE level = 'job_card' AND reference_id IN (
          SELECT job_card_id FROM job_card WHERE work_order_id = ?
        ) AND log_date = ?
      `, [workOrderId, logDate]);

      if (rows.length === 0 || rows[0].total_run_time === null) {
        // No data, delete work order OEE record
        await this.db.query(`
          DELETE FROM oee_analysis 
          WHERE level = 'work_order' AND reference_id = ? AND log_date = ?
        `, [workOrderId, logDate]);
        return null;
      }
      const summary = rows[0];

      const availability = summary.weighted_availability || 0;
      const performance = summary.weighted_performance || 0;
      const quality = summary.weighted_quality || 0;
      const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

      const oeeData = {
        level: 'work_order',
        reference_id: workOrderId,
        log_date: logDate,
        shift: 'All Day',
        availability: Math.min(100, availability),
        performance: Math.min(100, performance),
        quality: Math.min(100, quality),
        oee: Math.min(100, oee),
        planned_production_time: summary.total_planned || 0,
        downtime: summary.total_downtime || 0,
        actual_run_time: summary.total_run_time || 0,
        total_produced_qty: summary.total_produced || 0,
        accepted_qty: summary.total_accepted || 0,
        availability_loss: summary.total_avail_loss || 0,
        performance_loss: summary.total_perf_loss || 0,
        quality_loss_qty: summary.total_qual_loss || 0
      };

      await this.db.query(`
        INSERT INTO oee_analysis (
          level, reference_id, log_date, shift, availability, performance, quality, oee,
          planned_production_time, downtime, actual_run_time, 
          total_produced_qty, accepted_qty, availability_loss, performance_loss, quality_loss_qty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          availability = VALUES(availability),
          performance = VALUES(performance),
          quality = VALUES(quality),
          oee = VALUES(oee),
          planned_production_time = VALUES(planned_production_time),
          downtime = VALUES(downtime),
          actual_run_time = VALUES(actual_run_time),
          total_produced_qty = VALUES(total_produced_qty),
          accepted_qty = VALUES(accepted_qty),
          availability_loss = VALUES(availability_loss),
          performance_loss = VALUES(performance_loss),
          quality_loss_qty = VALUES(quality_loss_qty)
      `, Object.values(oeeData));

      return oeeData;
    } catch (error) {
      console.error('Error calculating Work Order OEE:', error);
      throw error;
    }
  }

  /**
   * Calculate consolidated OEE for a Workstation
   */
  async calculateAndSaveWorkstationOEE(machineId, logDate) {
    try {
      // 1. Get components consolidated by shift to avoid overcounting planned time
      // We assume each unique shift on a machine has a fixed planned time (e.g. 480 mins)
      const [shiftComponents] = await this.db.query(`
        SELECT 
          shift,
          MAX(planned_production_time) as shift_planned_time,
          SUM(downtime) as shift_downtime,
          SUM(actual_run_time) as shift_run_time,
          SUM(total_produced_qty) as shift_produced,
          SUM(accepted_qty) as shift_accepted,
          SUM(availability_loss) as shift_avail_loss,
          SUM(performance_loss) as shift_perf_loss,
          SUM(quality_loss_qty) as shift_qual_loss,
          SUM(ideal_cycle_time * total_produced_qty) as shift_valuable_time
        FROM oee_analysis
        WHERE level = 'job_card' AND reference_id IN (
          SELECT job_card_id FROM job_card WHERE machine_id = ?
        ) AND log_date = ?
        GROUP BY shift
      `, [machineId, logDate]);

      if (shiftComponents.length === 0) {
        // No data, delete workstation OEE record
        await this.db.query(`
          DELETE FROM oee_analysis 
          WHERE level = 'workstation' AND reference_id = ? AND log_date = ?
        `, [machineId, logDate]);
        return null;
      }

      let totalPlanned = 0;
      let totalDowntime = 0;
      let totalRunTime = 0;
      let totalProduced = 0;
      let totalAccepted = 0;
      let totalAvailLoss = 0;
      let totalPerfLoss = 0;
      let totalQualLoss = 0;
      let totalValuableTime = 0;

      shiftComponents.forEach(s => {
        totalPlanned += parseFloat(s.shift_planned_time || 480);
        totalDowntime += parseFloat(s.shift_downtime || 0);
        totalRunTime += parseFloat(s.shift_run_time || 0);
        totalProduced += parseFloat(s.shift_produced || 0);
        totalAccepted += parseFloat(s.shift_accepted || 0);
        totalAvailLoss += parseFloat(s.shift_avail_loss || 0);
        totalPerfLoss += parseFloat(s.shift_perf_loss || 0);
        totalQualLoss += parseFloat(s.shift_qual_loss || 0);
        totalValuableTime += parseFloat(s.shift_valuable_time || 0);
      });

      // 2. Calculate OEE from consolidated components
      const availability = totalPlanned > 0 ? ((totalPlanned - totalDowntime) / totalPlanned) * 100 : 0;
      const performance = totalRunTime > 0 ? (totalValuableTime / totalRunTime) * 100 : 0;
      const quality = totalProduced > 0 ? (totalAccepted / totalProduced) * 100 : 0;
      const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;

      const oeeData = {
        level: 'workstation',
        reference_id: machineId,
        log_date: logDate,
        shift: 'All Day',
        availability: Math.min(100, Math.max(0, availability)),
        performance: Math.min(100, Math.max(0, performance)),
        quality: Math.min(100, Math.max(0, quality)),
        oee: Math.min(100, Math.max(0, oee)),
        planned_production_time: totalPlanned,
        downtime: totalDowntime,
        actual_run_time: totalRunTime,
        total_produced_qty: totalProduced,
        accepted_qty: totalAccepted,
        availability_loss: totalAvailLoss,
        performance_loss: totalPerfLoss,
        quality_loss_qty: totalQualLoss
      };

      await this.db.query(`
        INSERT INTO oee_analysis (
          level, reference_id, log_date, shift, availability, performance, quality, oee,
          planned_production_time, downtime, actual_run_time, 
          total_produced_qty, accepted_qty, availability_loss, performance_loss, quality_loss_qty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          availability = VALUES(availability),
          performance = VALUES(performance),
          quality = VALUES(quality),
          oee = VALUES(oee),
          planned_production_time = VALUES(planned_production_time),
          downtime = VALUES(downtime),
          actual_run_time = VALUES(actual_run_time),
          total_produced_qty = VALUES(total_produced_qty),
          accepted_qty = VALUES(accepted_qty),
          availability_loss = VALUES(availability_loss),
          performance_loss = VALUES(performance_loss),
          quality_loss_qty = VALUES(quality_loss_qty)
      `, Object.values(oeeData));

      return oeeData;
    } catch (error) {
      console.error('Error calculating Workstation OEE:', error);
      throw error;
    }
  }

  /**
   * Get OEE analysis records for a specific level and reference
   */
  async getAnalysis(level, referenceId, filters = {}) {
    try {
      let query = `SELECT * FROM oee_analysis WHERE level = ? AND reference_id = ?`;
      const params = [level, referenceId];

      if (filters.startDate) {
        query += ' AND log_date >= ?';
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ' AND log_date <= ?';
        params.push(filters.endDate);
      }

      query += ' ORDER BY log_date DESC, shift ASC';

      const [rows] = await this.db.query(query, params);
      return rows;
    } catch (error) {
      console.error(`Error fetching OEE analysis for ${level}:`, error);
      throw error;
    }
  }

  /**
   * Get work orders for a workstation with their OEE metrics
   */
  async getWorkOrdersForWorkstation(machineId, filters = {}) {
    try {
      const [rows] = await this.db.query(`
        SELECT DISTINCT wo.wo_id, wo.item_code, i.name as item_name,
               oa.oee, oa.availability, oa.performance, oa.quality, oa.log_date
        FROM work_order wo
        JOIN job_card jc ON wo.wo_id = jc.work_order_id
        JOIN item i ON wo.item_code = i.item_code
        LEFT JOIN oee_analysis oa ON oa.level = 'work_order' AND oa.reference_id = wo.wo_id
        WHERE jc.machine_id = ?
        ORDER BY wo.created_at DESC
      `, [machineId]);
      return rows;
    } catch (error) {
      console.error('Error fetching work orders for workstation OEE:', error);
      throw error;
    }
  }

  /**
   * Get job cards for a work order with their OEE metrics
   */
  async getJobCardsForWorkOrder(workOrderId, filters = {}) {
    try {
      const [rows] = await this.db.query(`
        SELECT jc.job_card_id, jc.operation, jc.machine_id,
               oa.oee, oa.availability, oa.performance, oa.quality, oa.log_date, oa.shift
        FROM job_card jc
        LEFT JOIN oee_analysis oa ON oa.level = 'job_card' AND oa.reference_id = jc.job_card_id
        WHERE jc.work_order_id = ?
        ORDER BY jc.operation_sequence ASC
      `, [workOrderId]);
      return rows;
    } catch (error) {
      console.error('Error fetching job cards for work order OEE:', error);
      throw error;
    }
  }

  /**
   * Get production/time entries for a job card
   */
  async getEntriesForJobCard(jobCardId, filters = {}) {
    try {
      let timeLogQuery = `
        SELECT 'time_log' as entry_type, time_log_id as id, log_date, shift, 
               completed_qty as produced, accepted_qty, rejected_qty, time_in_minutes as duration
        FROM time_log
        WHERE job_card_id = ?
      `;
      let downtimeQuery = `
        SELECT 'downtime' as entry_type, downtime_id as id, log_date, shift,
               downtime_type, downtime_reason, duration_minutes as duration
        FROM downtime_entry
        WHERE job_card_id = ?
      `;
      const timeLogParams = [jobCardId];
      const downtimeParams = [jobCardId];

      if (filters.startDate) {
        timeLogQuery += ' AND log_date >= ?';
        downtimeQuery += ' AND log_date >= ?';
        timeLogParams.push(filters.startDate);
        downtimeParams.push(filters.startDate);
      }
      if (filters.endDate) {
        timeLogQuery += ' AND log_date <= ?';
        downtimeQuery += ' AND log_date <= ?';
        timeLogParams.push(filters.endDate);
        downtimeParams.push(filters.endDate);
      }

      const [timeLogs] = await this.db.query(timeLogQuery, timeLogParams);
      const [downtimes] = await this.db.query(downtimeQuery, downtimeParams);

      // Combine and sort by date/shift
      return [...timeLogs, ...downtimes].sort((a, b) => {
        const dateCompare = new Date(b.log_date) - new Date(a.log_date);
        if (dateCompare !== 0) return dateCompare;
        return (b.shift || '').localeCompare(a.shift || '');
      });
    } catch (error) {
      console.error('Error fetching entries for job card OEE:', error);
      throw error;
    }
  }
  async getRecentJobCardOEE(limit = 10, filters = {}) {
    const cleanedFilters = this._cleanFilters(filters)
    try {
      let query = `
        SELECT 
          jc.job_card_id as id,
          jc.machine_id as workstation,
          w.workstation_name as workstation_desc,
          jc.operation,
          jc.planned_quantity as target,
          oa.total_produced_qty as produced,
          oa.quality_loss_qty as rejected,
          oa.oee,
          oa.log_date,
          oa.shift
        FROM job_card jc
        JOIN oee_analysis oa ON oa.level = 'job_card' AND oa.reference_id = jc.job_card_id
        LEFT JOIN workstation w ON jc.machine_id = w.name
        WHERE 1=1
      `
      const params = []
      
      if (cleanedFilters.startDate) {
        query += ' AND oa.log_date >= ?'
        params.push(cleanedFilters.startDate)
      }
      if (cleanedFilters.endDate) {
        query += ' AND oa.log_date <= ?'
        params.push(cleanedFilters.endDate)
      }
      if (cleanedFilters.machineId) {
        query += ' AND jc.machine_id = ?'
        params.push(cleanedFilters.machineId)
      }

      query += ' ORDER BY oa.log_date DESC, oa.shift DESC LIMIT ?'
      params.push(limit)

      const [rows] = await this.db.query(query, params)
      return rows.map(r => ({
        ...r,
        target: Number(r.target || 0),
        produced: Number(r.produced || 0),
        rejected: Number(r.rejected || 0),
        oee: Number(r.oee || 0)
      }))
    } catch (error) {
      console.error('Error fetching recent job card OEE:', error)
      throw error
    }
  }
}

export default OEEModel
