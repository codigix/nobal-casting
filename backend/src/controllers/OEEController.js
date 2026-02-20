
import OEEModel from '../models/OEEModel.js'

class OEEController {
  constructor(db) {
    this.oeeModel = new OEEModel(db)
  }

  async getOEEDashboardData(req, res) {
    try {
      const filters = req.query
      
      console.log('Fetching OEE Data with filters:', filters);
      const [summary, trends, downtimeReasons, machineOEE, recentJobCards] = await Promise.all([
        this.oeeModel.getOEESummary(filters).catch(e => { console.error('Summary Error:', e); return { availability: 0, performance: 0, quality: 0, oee: 0 }; }),
        this.oeeModel.getTrends(filters).catch(e => { console.error('Trends Error:', e); return []; }),
        this.oeeModel.getDowntimeReasons(filters).catch(e => { console.error('Downtime Error:', e); return []; }),
        this.oeeModel.getOEEMetrics(filters).catch(e => { console.error('Metrics Error:', e); return []; }),
        this.oeeModel.getRecentJobCardOEE(10, filters).catch(e => { console.error('Recent JC Error:', e); return []; })
      ])
      
      console.log(`OEE Dashboard Data: summary=${summary ? 'yes' : 'no'}, trends=${trends?.length || 0}, downtimeReasons=${downtimeReasons?.length || 0}, machineOEE=${machineOEE?.length || 0}, recentJobCards=${recentJobCards?.length || 0}`);
      res.status(200).json({
        success: true,
        data: {
          summary,
          trends,
          downtimeReasons,
          machineOEE,
          recentJobCards
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
        
        if (!acc[week]) acc[week] = { week, performance: 0, oee: 0, working_time: 0, downtime: 0, count: 0 }
        acc[week].performance += curr.performance
        acc[week].oee += curr.oee
        acc[week].working_time += (curr.working_time || 0)
        acc[week].downtime += (curr.downtime || 0)
        acc[week].count += 1
        return acc
      }, {})

      // Monthly grouping
      const monthlyTrends = trends.reduce((acc, curr) => {
        const date = new Date(curr.date)
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!acc[month]) acc[month] = { month, performance: 0, oee: 0, working_time: 0, downtime: 0, count: 0 }
        acc[month].performance += curr.performance
        acc[month].oee += curr.oee
        acc[month].working_time += (curr.working_time || 0)
        acc[month].downtime += (curr.downtime || 0)
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
            avg_efficiency: Number((w.oee / w.count).toFixed(2)),
            working_time: Number(w.working_time.toFixed(2)),
            downtime: Number(w.downtime.toFixed(2))
          })),
          monthly: Object.values(monthlyTrends).map(m => ({
            month: m.month,
            avg_performance_percentage: Number((m.performance / m.count).toFixed(2)),
            avg_efficiency_percentage: Number((m.oee / m.count).toFixed(2)),
            working_time: Number(m.working_time.toFixed(2)),
            downtime: Number(m.downtime.toFixed(2))
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

  async getAllMachinesAnalysis(req, res) {
    try {
      const filters = req.query
      const analysis = await this.oeeModel.getAllMachinesComprehensiveAnalysis(filters)
      
      res.status(200).json({
        success: true,
        data: analysis
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching all machines analysis',
        error: error.message
      })
    }
  }

  async getWorkstationDrillDown(req, res) {
    try {
      const { machine_id } = req.params;
      const filters = req.query;
      
      // 1. Get aggregate metrics for the workstation
      const analysisRecords = await this.oeeModel.getAnalysis('workstation', machine_id, filters);
      
      // 2. Get child work orders
      const workOrders = await this.oeeModel.getWorkOrdersForWorkstation(machine_id, filters);
      
      // Calculate averages from analysis records
      const metrics = { a: 0, p: 0, q: 0, oee: 0, total_units: 0 };
      const losses = { availability: 0, performance: 0, quality: 0 };
      
      if (analysisRecords.length > 0) {
        const count = analysisRecords.length;
        analysisRecords.forEach(r => {
          metrics.a += Number(r.availability || 0);
          metrics.p += Number(r.performance || 0);
          metrics.q += Number(r.quality || 0);
          metrics.oee += Number(r.oee || 0);
          metrics.total_units += Number(r.total_produced_qty || 0);
          losses.availability += Number(r.availability_loss || 0);
          losses.performance += Number(r.performance_loss || 0);
          losses.quality += Number(r.quality_loss_qty || 0);
        });
        metrics.a /= count;
        metrics.p /= count;
        metrics.q /= count;
        metrics.oee /= count;
      }

      const formattedSubEntities = workOrders.map(wo => ({
        id: wo.wo_id,
        name: `${wo.wo_id} - ${wo.item_name}`,
        oee: Number(wo.oee || 0),
        a: Number(wo.availability || 0),
        p: Number(wo.performance || 0),
        q: Number(wo.quality || 0),
        status: wo.log_date ? 'Active' : 'Planned'
      }));

      res.status(200).json({ 
        success: true, 
        data: {
          metrics,
          losses,
          subEntities: formattedSubEntities
        } 
      });
    } catch (error) {
      console.error('Workstation DrillDown Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getWorkOrderDrillDown(req, res) {
    try {
      const { wo_id } = req.params;
      const filters = req.query;
      
      // 1. Get aggregate metrics for the work order
      const analysisRecords = await this.oeeModel.getAnalysis('work_order', wo_id, filters);
      
      // 2. Get child job cards
      const jobCards = await this.oeeModel.getJobCardsForWorkOrder(wo_id, filters);
      
      const metrics = { a: 0, p: 0, q: 0, oee: 0, total_units: 0 };
      const losses = { availability: 0, performance: 0, quality: 0 };
      
      if (analysisRecords.length > 0) {
        const count = analysisRecords.length;
        analysisRecords.forEach(r => {
          metrics.a += Number(r.availability || 0);
          metrics.p += Number(r.performance || 0);
          metrics.q += Number(r.quality || 0);
          metrics.oee += Number(r.oee || 0);
          metrics.total_units += Number(r.total_produced_qty || 0);
          losses.availability += Number(r.availability_loss || 0);
          losses.performance += Number(r.performance_loss || 0);
          losses.quality += Number(r.quality_loss_qty || 0);
        });
        metrics.a /= count;
        metrics.p /= count;
        metrics.q /= count;
        metrics.oee /= count;
      }

      const formattedSubEntities = jobCards.map(jc => ({
        id: jc.job_card_id,
        name: `${jc.operation} @ ${jc.machine_id}`,
        oee: Number(jc.oee || 0),
        a: Number(jc.availability || 0),
        p: Number(jc.performance || 0),
        q: Number(jc.quality || 0),
        status: jc.shift ? `Shift ${jc.shift}` : 'Pending'
      }));

      res.status(200).json({ 
        success: true, 
        data: {
          metrics,
          losses,
          subEntities: formattedSubEntities
        } 
      });
    } catch (error) {
      console.error('WorkOrder DrillDown Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getJobCardDrillDown(req, res) {
    try {
      const { jc_id } = req.params;
      const filters = req.query;
      
      // 1. Get aggregate metrics for the job card
      const analysisRecords = await this.oeeModel.getAnalysis('job_card', jc_id, filters);
      
      // 2. Get production logs
      const entries = await this.oeeModel.getEntriesForJobCard(jc_id, filters);
      
      const metrics = { a: 0, p: 0, q: 0, oee: 0, total_units: 0 };
      const losses = { availability: 0, performance: 0, quality: 0 };
      
      if (analysisRecords.length > 0) {
        const count = analysisRecords.length;
        analysisRecords.forEach(r => {
          metrics.a += Number(r.availability || 0);
          metrics.p += Number(r.performance || 0);
          metrics.q += Number(r.quality || 0);
          metrics.oee += Number(r.oee || 0);
          metrics.total_units += Number(r.total_produced_qty || 0);
          losses.availability += Number(r.availability_loss || 0);
          losses.performance += Number(r.performance_loss || 0);
          losses.quality += Number(r.quality_loss_qty || 0);
        });
        metrics.a /= count;
        metrics.p /= count;
        metrics.q /= count;
        metrics.oee /= count;
      }

      const formattedSubEntities = entries.map(e => {
        const produced = parseFloat(e.produced || 0);
        const accepted = parseFloat(e.accepted_qty || 0);
        const quality = produced > 0 ? (accepted / produced) * 100 : 0;
        
        return {
          id: e.id,
          name: `${e.entry_type === 'time_log' ? 'Time Log' : 'Downtime'} - ${new Date(e.log_date).toLocaleDateString()}`,
          oee: e.entry_type === 'time_log' ? quality : 0,
          a: e.entry_type === 'time_log' ? 100 : 0,
          p: e.entry_type === 'time_log' ? 100 : 0, // Simplified for log level
          q: e.entry_type === 'time_log' ? quality : 0,
          status: e.shift ? `Shift ${e.shift}` : 'N/A'
        };
      });

      res.status(200).json({ 
        success: true, 
        data: {
          metrics,
          losses,
          subEntities: formattedSubEntities
        } 
      });
    } catch (error) {
      console.error('JobCard DrillDown Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getAnalysis(req, res) {
    try {
      const { level, reference_id } = req.params;
      const analysis = await this.oeeModel.getAnalysis(level, reference_id, req.query);
      res.status(200).json({ success: true, data: analysis });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default OEEController
