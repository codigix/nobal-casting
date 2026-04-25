import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, CheckCircle, Clock, Package, Activity, Factory, 
  User, Calendar, Trash2, Zap, TrendingUp, Layers, ChevronRight, X
} from 'lucide-react'
import Modal from '../Modal'
import DataTable from '../Table/DataTable'
import * as productionService from '../../services/productionService'
import { useToast } from '../ToastContainer'

const parseUTCDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(dateStr);
};

const formatToLocalDisplay = (dateStr) => {
  if (!dateStr) return 'N/A'
  let d = new Date(dateStr)
  
  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const utcDate = new Date(dateStr.replace(' ', 'T') + 'Z')
    if (!isNaN(utcDate.getTime())) {
      d = utcDate
    }
  }
  
  if (isNaN(d.getTime())) return 'N/A'
  
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
}

export default function ViewJobCardModal({ isOpen, onClose, onSuccess, jobCardId }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [jobCard, setJobCard] = useState(null)
  const [timeLogs, setTimeLogs] = useState([])
  const [rejections, setRejections] = useState([])
  const [downtimes, setDowntimes] = useState([])
  const [dependencies, setDependencies] = useState([])
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  useEffect(() => {
    if (isOpen && jobCardId) {
      fetchJobCardDetails()
    }
  }, [isOpen, jobCardId])

  const fetchJobCardDetails = async () => {
    try {
      setLoading(true)
      const [jobCardRes, timeLogsRes, rejectionsRes, downtimesRes] = await Promise.all([
        productionService.getJobCardDetails(jobCardId),
        productionService.getTimeLogs({ job_card_id: jobCardId }),
        productionService.getRejections({ job_card_id: jobCardId }),
        productionService.getDowntimes({ job_card_id: jobCardId })
      ])
      
      const jc = jobCardRes.data || jobCardRes
      setJobCard(jc)
      setNewStatus(jc?.status || '')
      setTimeLogs(timeLogsRes.data || [])
      setRejections(rejectionsRes.data || [])
      setDowntimes(downtimesRes.data || [])

      if (jc?.work_order_id) {
        const depRes = await productionService.getWorkOrderDependencies(jc.work_order_id, 'child')
        setDependencies(depRes.data || depRes || [])
      }
    } catch (err) {
      toast.addToast(err.message || 'Failed to load job card details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const statusWorkflow = {
    'draft': ['ready', 'pending', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
    'planned': ['ready', 'pending', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
    'ready': ['pending', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
    'sent-to-vendor': ['partially-received', 'received', 'completed', 'hold', 'cancelled'],
    'partially-received': ['received', 'completed', 'hold', 'cancelled'],
    'received': ['completed', 'hold', 'cancelled'],
    'in-progress': ['completed', 'hold', 'cancelled'],
    'hold': ['in-progress', 'completed', 'cancelled', 'sent-to-vendor', 'received'],
    'completed': ['completed'],
    'open': ['ready', 'pending', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
    'pending': ['ready', 'in-progress', 'hold', 'completed', 'cancelled', 'sent-to-vendor'],
    'cancelled': ['cancelled']
  }

  const getAllowedStatuses = (currentStatus) => {
    return statusWorkflow[String(currentStatus || '').toLowerCase().replace(/\s+/g, '-').trim()] || []
  }

  const getNextStatus = (currentStatus) => {
    const allowed = getAllowedStatuses(currentStatus)
    // Default next step for production flow is usually in-progress or the first allowed
    const startable = ['in-progress', 'ready', 'pending']
    const next = allowed.find(s => startable.includes(s)) || allowed[0]
    return next || String(currentStatus || '').toLowerCase().trim() || 'draft'
  }

  const handleNextStep = async () => {
    const nextStatus = getNextStatus(jobCard?.status)
    
    // START VALIDATION
    if (nextStatus === 'in-progress') {
      const executionMode = (jobCard?.execution_mode || '').toUpperCase().trim();
      const isOutsource = executionMode === 'OUTSOURCE' || executionMode === 'SUBCONTRACT';

      if (!isOutsource) {
        if (!jobCard?.operator_id) {
          toast.addToast('Please assign an operator before starting the job card', 'error');
          return;
        }
        if (!jobCard?.machine_id) {
          toast.addToast('Please assign a workstation before starting the job card', 'error');
          return;
        }
        if (!jobCard?.scheduled_start_date) {
          toast.addToast('Please set a scheduled start date and time before starting the job card', 'error');
          return;
        }
      } else {
        if (!jobCard?.vendor_id) {
          toast.addToast('Please assign a vendor before starting this outsourced job card', 'error');
          return;
        }
      }
    }

    // Safety Check: Shortfall Warning
    if (nextStatus === 'completed') {
      const planned = Number(jobCard?.planned_quantity || 0);
      const accepted = Number(metrics?.acceptedQty || 0);
      const transferred = Number(metrics?.transferredQty || 0);

      // Check if all accepted units are transferred
      if (transferred < (accepted - 0.001)) {
        const confirmMsg = `Only ${transferred.toFixed(2)} units have been transferred out of ${accepted.toFixed(2)} accepted units. \n\nAre you sure you want to mark it as COMPLETED? Remaining units should ideally be transferred for the next operation to proceed correctly.`;
        if (!window.confirm(confirmMsg)) return;
      }
      
      // Check if total produced matches plan
      if (accepted < (planned - 0.001)) {
        const confirmMsg = `This operation has only produced ${accepted.toFixed(2)} units out of the planned ${planned.toFixed(2)}. \n\nAre you sure you want to mark it as COMPLETED? You won't be able to log more production for this job card.`;
        if (!window.confirm(confirmMsg)) return;
      }
    }

    await updateStatus(nextStatus)
  }

  const updateStatus = async (status) => {
    try {
      setUpdatingStatus(true)
      await productionService.updateJobCard(jobCardId, { status })
      setJobCard(prev => ({ ...prev, status }))
      setNewStatus(status)
      toast.addToast('Status updated successfully', 'success')
      onSuccess?.()
    } catch (err) {
      toast.addToast(err.message || 'Failed to update status', 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const format12h = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const m = minutes;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
  };

  const getDailyLogs = () => {
    const logsMap = {}

    // Group time logs by day_number and shift
    timeLogs.forEach(log => {
      const dateVal = log.log_date || (log.created_at ? log.created_at.split('T')[0] : null)
      if (!dateVal) return
      const shift = log.shift || 'A'
      const dayNum = log.day_number || 1
      const key = `day-${dayNum}-${shift}`

      if (!logsMap[key]) {
        logsMap[key] = { 
          date: dateVal, shift, 
          tl_produced: 0, tl_rejected: 0, tl_scrap: 0,
          rej_produced: 0, rej_rejected: 0, rej_scrap: 0, rej_accepted: 0,
          downtime: 0, day_number: dayNum,
          isApproved: false
        }
      }
      logsMap[key].tl_produced += Number(log.completed_qty) || 0
      logsMap[key].tl_scrap += Number(log.scrap_qty) || 0
      logsMap[key].tl_rejected += Number(log.rejected_qty) || 0
    })

    // Group rejections by day_number and shift
    rejections.forEach(rej => {
      const dateVal = rej.log_date || (rej.created_at ? rej.created_at.split('T')[0] : null)
      if (!dateVal) return
      const shift = rej.shift || 'A'
      const dayNum = rej.day_number || 1
      const key = `day-${dayNum}-${shift}`
      
      if (!logsMap[key]) {
        logsMap[key] = { 
          date: dateVal, shift, 
          tl_produced: 0, tl_rejected: 0, tl_scrap: 0,
          rej_produced: 0, rej_rejected: 0, rej_scrap: 0, rej_accepted: 0,
          downtime: 0, day_number: dayNum,
          isApproved: false
        }
      }
      
      const rQty = Number(rej.rejected_qty) || 0
      const sQty = Number(rej.scrap_qty) || 0
      const aQty = Number(rej.accepted_qty) || 0
      
      logsMap[key].rej_produced += (aQty + Math.max(rQty, sQty))
      
      if (rej.status === 'Approved') {
        logsMap[key].rej_rejected += rQty
        logsMap[key].rej_scrap += sQty
        logsMap[key].rej_accepted += aQty
        logsMap[key].isApproved = true
      }
    })

    // Calculate final metrics for each log using MAX logic to match backend
    Object.keys(logsMap).forEach(key => {
      const log = logsMap[key]
      log.produced = Math.max(log.tl_produced, log.rej_produced)
      
      // Merge Rejected and Scrap as they are considered the same (Scrap)
      const rejectedRaw = Math.max(log.tl_rejected, log.rej_rejected)
      const scrapRaw = Math.max(log.tl_scrap, log.rej_scrap)
      log.scrap = Math.max(rejectedRaw, scrapRaw)
      log.rejected = log.scrap // Keep for backward compatibility if needed, but display will use one
      
      // Validated Yield (accepted) comes primarily from approved rejection entries (Quality Gate)
      // ENSURE NON-ADDITIVE LOGIC: If explicit quality data exists, we use (Produced - Max(Rej, Scrap))
      // to autocorrect any double-deductions in the underlying records.
      log.accepted = log.rej_produced > 0 
        ? Math.max(0, log.rej_produced - Math.max(log.rej_rejected, log.rej_scrap)) 
        : Math.max(0, log.produced - log.scrap)
    })

    // Group downtimes by day_number and shift
    downtimes.forEach(dt => {
      const dateVal = dt.log_date || (dt.created_at ? dt.created_at.split('T')[0] : null)
      if (!dateVal) return
      const shift = dt.shift || 'A'
      const dayNum = dt.day_number || 1
      const key = `day-${dayNum}-${shift}`
      
      if (!logsMap[key]) {
        logsMap[key] = { 
          date: dateVal, shift, 
          tl_produced: 0, tl_rejected: 0, tl_scrap: 0,
          rej_produced: 0, rej_rejected: 0, rej_scrap: 0, rej_accepted: 0,
          produced: 0, accepted: 0, rejected: 0, scrap: 0,
          downtime: 0, day_number: dayNum,
          isApproved: false
        }
      }
      logsMap[key].downtime += Number(dt.duration_minutes) || 0
    })

    return Object.values(logsMap)
      .sort((a, b) => {
        if (Number(a.day_number) !== Number(b.day_number)) return Number(a.day_number) - Number(b.day_number)
        return a.shift.localeCompare(b.shift)
      })
  }

  if (!jobCard && !loading) {
    return null
  }

  const dailyLogs = getDailyLogs()

  // Interconnected dynamic metrics calculation
  const metrics = (() => {
    if (!jobCard) return null;

    const plannedQty = Number(jobCard.planned_quantity || 0);
    const transferredQty = Number(jobCard.transferred_quantity || 0);
    
    // Aggregated data from logs (same logic as backend sync)
    const logsData = getDailyLogs();
    const producedQty = logsData.reduce((sum, log) => sum + (log.produced || 0), 0);
    const acceptedQty = logsData.reduce((sum, log) => sum + (log.accepted || 0), 0);
    const rejectedQty = logsData.reduce((sum, log) => sum + (log.rejected || 0), 0);
    const scrapQty = logsData.reduce((sum, log) => sum + (log.scrap || 0), 0);
    const cycleTime = Number(jobCard.operation_time || 0); 

    const actualProductionMinutes = timeLogs.reduce((sum, log) => {
      const parseTime = (time, period) => {
        if (!time) return 0;
        let [hours, minutes] = time.split(':').map(Number);
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      const start = parseTime(log.from_time, log.from_period);
      const end = parseTime(log.to_time, log.to_period);
      let diff = end - start;
      if (diff < 0) diff += 24 * 60;
      return sum + diff;
    }, 0);

    const downtimeMinutes = Array.isArray(downtimes) ? downtimes.reduce((sum, dt) => sum + (Number(dt.duration_minutes) || 0), 0) : 0;
    const totalActualMinutes = actualProductionMinutes + downtimeMinutes;
    
    let productionStartDisplay = 'N/A';
    if (timeLogs.length > 0) {
      const sortedLogs = [...timeLogs].sort((a, b) => {
        const dateA = parseUTCDate(a.log_date || a.created_at);
        const dateB = parseUTCDate(b.log_date || b.created_at);
        return dateA - dateB;
      });
      const firstLog = sortedLogs[0];
      const date = parseUTCDate(firstLog.log_date || firstLog.created_at);
      productionStartDisplay = `${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${format12h(firstLog.from_time)}`;
    } else if (jobCard.actual_start_date) {
      productionStartDisplay = parseUTCDate(jobCard.actual_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }

    let estimatedEndDisplay = 'N/A';
    if (jobCard.status === 'completed' && (jobCard.actual_end_date || jobCard.updated_at)) {
      estimatedEndDisplay = parseUTCDate(jobCard.actual_end_date || jobCard.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } else if (jobCard.status === 'in-progress' || jobCard.status === 'pending') {
      const remainingQty = Math.max(0, plannedQty - acceptedQty);
      const avgCycleTime = producedQty > 0 ? (actualProductionMinutes / producedQty) : cycleTime;
      const minutesRemaining = remainingQty * (avgCycleTime || cycleTime || 1);
      
      if (minutesRemaining > 0) {
        const estDate = new Date();
        estDate.setMinutes(estDate.getMinutes() + minutesRemaining);
        estimatedEndDisplay = estDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
      } else {
        estimatedEndDisplay = 'Imminent';
      }
    } else {
      estimatedEndDisplay = jobCard.scheduled_end_date ? parseUTCDate(jobCard.scheduled_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'N/A';
    }

    return {
      totalActualMinutes,
      actualProductionMinutes,
      downtimeMinutes,
      productionStartDisplay,
      estimatedEndDisplay,
      producedQty,
      acceptedQty,
      rejectedQty,
      scrapQty,
      transferredQty,
      progress: Math.min(100, Math.round((producedQty / (plannedQty || 1)) * 100))
    };
  })();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Operational Intelligence" size="3xl">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-6 h-6  border-4 border-indigo-100 border-t-indigo-600 rounded  animate-spin mb-4" />
          <p className="text-xs  text-gray-400  text-center">Decrypting Operational Data...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* High-Level Overview */}
          <div className="bg-gray-900 rounded  p-2 text-white  relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded  -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700" />
            
            <div className="relative z-0">
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2  py-1 bg-indigo-500/20 text-indigo-300 rounded  text-xs    border border-indigo-500/30">
                      ID: {jobCard?.job_card_id}
                    </span>
                    <span className={`p-2  py-1 rounded  text-xs    border ${
                      jobCard?.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      jobCard?.status === 'in-progress' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                      {jobCard?.status?.replace('-', ' ')}
                    </span>
                    {jobCard?.priority && (
                      <span className={`p-2 py-1 rounded text-xs border ${
                        jobCard.priority.toLowerCase() === 'high' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                        jobCard.priority.toLowerCase() === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}>
                        {jobCard.priority} Priority
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl  text-white er leading-none">{jobCard?.operation || 'Process Phase'}</h2>
                  <p className="text-gray-400   text-xs  mt-1">Work Order: {jobCard?.work_order_id}</p>
                </div>
                <div className="">
                  <p className="text-xs   text-gray-500  mb-1">Quality Yield</p>
                  <div className="text-xl  er text-indigo-400">
                    {metrics?.producedQty > 0 ? Math.round((metrics.acceptedQty / metrics.producedQty) * 100) : 0}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 pt-2 border-t border-white/10">
                <div className="">
                  <p className="text-xs   text-gray-500 ">Planned Capacity</p>
                  <p className="text-sm  ">{parseFloat(jobCard?.planned_quantity || 0).toFixed(2)} <span className="text-xs text-gray-500">Units</span></p>
                </div>
                <div className="">
                  <p className="text-xs   text-gray-500 ">Accepted Output</p>
                  <p className="text-sm   text-emerald-400">{parseFloat(metrics?.acceptedQty || 0).toFixed(2)} <span className="text-xs text-emerald-500/50">Units</span></p>
                  <p className="text-[10px] text-gray-500">Total Produced: {parseFloat(metrics?.producedQty || 0).toFixed(2)}</p>
                </div>
                <div className="">
                  <p className="text-xs   text-gray-500 ">Transferred</p>
                  <p className="text-sm   text-indigo-400">{parseFloat(metrics?.transferredQty || 0).toFixed(2)} <span className="text-xs text-indigo-500/50">Units</span></p>
                  <p className="text-[10px] text-gray-500">Available: {parseFloat((metrics?.acceptedQty || 0) - (metrics?.transferredQty || 0)).toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-gray-500">Production Progress</p>
                    <p className="text-[10px] text-indigo-400 font-medium">
                      {metrics?.progress}%
                    </p>
                  </div>
                  <div className="w-full bg-white/10 rounded  h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        metrics?.producedQty > parseFloat(jobCard?.planned_quantity || 0) 
                          ? 'bg-rose-500' 
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${metrics?.progress}%` }}
                    />
                  </div>
                  {metrics?.producedQty > parseFloat(jobCard?.planned_quantity || 0) && (
                    <p className="text-[9px] text-rose-400 mt-1 animate-pulse">⚠️ Overproduction detected (+{parseFloat(metrics.producedQty - jobCard.planned_quantity).toFixed(2)} units)</p>
                  )}
                  {/* Detailed Quality Yield Bar */}
                  {metrics?.producedQty > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-gray-500">Quality Distribution</span>
                        <span className="text-emerald-400">Yield: {Math.round((metrics.acceptedQty / metrics.producedQty) * 100)}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          style={{ width: `${(metrics.acceptedQty / metrics.producedQty) * 100}%` }}
                        />
                        <div 
                          className="h-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                          style={{ width: `${((metrics.producedQty - metrics.acceptedQty) / metrics.producedQty) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            <div className="bg-white rounded p-2 border border-gray-100   space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-indigo-50 p-2 rounded  text-indigo-600">
                  <Calendar size={18} />
                </div>
                <h4 className="text-xs  text-gray-900 ">Operational Timeline</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-gray-50 rounded border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1">Scheduled Start</p>
                  <p className="text-xs text-gray-900">
                    {formatToLocalDisplay(jobCard?.scheduled_start_date)}
                  </p>
                </div>
                <div className="p-2 bg-indigo-50/50 rounded border border-indigo-100">
                  <p className="text-[10px] text-indigo-600 font-medium mb-1">Production Start</p>
                  <p className="text-xs text-indigo-900 font-semibold">
                    {metrics?.productionStartDisplay}
                  </p>
                </div>
                <div className="p-2 bg-amber-50/50 rounded border border-amber-100">
                  <p className="text-[10px] text-amber-600 font-medium mb-1">Estimated End</p>
                  <p className="text-xs text-amber-900 font-semibold">
                    {metrics?.estimatedEndDisplay}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-1">Target Finish</p>
                  <p className="text-xs text-gray-900">
                    {formatToLocalDisplay(jobCard?.scheduled_end_date)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded p-2 border border-gray-100   space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-emerald-50 p-2 rounded  text-emerald-600">
                  <TrendingUp size={18} />
                </div>
                <h4 className="text-xs  text-gray-900 ">Costing Details</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-2 bg-gray-50 rounded  border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Hourly Rate</p>
                  <p className="text-xs  text-gray-900 ">
                    ₹{parseFloat(jobCard?.hourly_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded  border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Actual Cost</p>
                  <p className="text-xs  text-gray-900 ">
                    ₹{parseFloat(jobCard?.operating_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {dependencies.length > 0 && (
              <div className="bg-white rounded p-3 border border-slate-100 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-indigo-50 p-1.5 rounded text-indigo-600">
                      <Layers size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs  text-slate-800">Sub-Assembly Readiness</h4>
                      <p className="text-[10px] text-slate-400">Current production status of required components</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px]  text-slate-500 uppercase">Ready</span>
                    <span className="text-xs font-black text-indigo-600">
                      {dependencies.filter(d => parseFloat(d.child_accepted_qty || 0) >= parseFloat(d.child_planned_qty || 0)).length} / {dependencies.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {dependencies.map((dep, idx) => {
                    const produced = parseFloat(dep.child_produced_qty || 0);
                    const accepted = parseFloat(dep.child_accepted_qty || 0);
                    const planned = parseFloat(dep.child_planned_qty || 0);
                    const progress = planned > 0 ? (accepted / planned) * 100 : 0;
                    const isDone = accepted >= planned;

                    return (
                      <div key={idx} className="p-2.5 bg-slate-50/50 rounded border border-slate-100 hover:border-indigo-200 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="min-w-0">
                            <h5 className="text-[11px]  text-slate-800 truncate" title={dep.child_item_name || dep.child_item_code}>
                              {dep.child_item_name || dep.child_item_code}
                            </h5>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">{dep.child_item_code}</p>
                          </div>
                          <div className={`px-1.5 py-0.5 rounded text-[9px]  uppercase tracking-tight ${
                            isDone ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {isDone ? 'Finished' : 'In-Progress'}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <p className="text-[9px] text-slate-400  uppercase mb-0.5">Produced</p>
                            <p className="text-[11px] font-black text-slate-600">{produced.toLocaleString()}</p>
                          </div>
                          <div className="">
                            <p className="text-[9px] text-emerald-500  uppercase mb-0.5">Accepted</p>
                            <p className="text-[11px] font-black text-emerald-600">{accepted.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[9px] text-slate-400  uppercase">Overall</span>
                          <span className="text-[10px] font-black text-slate-700">{accepted.toLocaleString()} / {planned.toLocaleString()}</span>
                        </div>

                        <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${isDone ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.2)]'}`}
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded p-2 border border-gray-100   space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-50 p-2 rounded  text-purple-600">
                  <User size={18} />
                </div>
                <h4 className="text-xs  text-gray-900 ">Assignment Data</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-2 bg-gray-50 rounded  border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Assigned Unit</p>
                  <p className="text-xs  text-gray-900  truncate">
                    {jobCard?.machine_name || jobCard?.machine_id || 'N/A'}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded  border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Operator / Vendor</p>
                  <p className="text-xs  text-gray-900  truncate">
                    {jobCard?.operator_name || jobCard?.vendor_name || jobCard?.operator_id || jobCard?.vendor_id || 'Unassigned'}
                  </p>
                </div>
              </div>
            </div>

            {jobCard?.execution_mode === 'OUTSOURCE' && (
              <div className="bg-white rounded p-2 border border-amber-100 bg-amber-50/10 space-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-amber-50 p-2 rounded text-amber-600">
                    <Package size={18} />
                  </div>
                  <h4 className="text-xs text-gray-900 ">Subcontracting Intelligence</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 bg-white rounded border border-amber-100">
                    <p className="text-[10px] text-amber-600   mb-1">Assigned Vendor</p>
                    <p className="text-xs text-gray-900 font-semibold">{jobCard?.vendor_name || 'N/A'}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-amber-100">
                    <p className="text-[10px] text-amber-600   mb-1">Dispatch Status</p>
                    <p className="text-xs text-gray-900 font-semibold">{jobCard?.subcontract_status?.replace(/_/g, ' ') || 'DRAFT'}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-amber-100">
                    <p className="text-[10px] text-amber-600   mb-1">Sent Qty</p>
                    <p className="text-xs text-gray-900 font-semibold">{jobCard?.sent_qty || 0} Units</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-amber-100">
                    <p className="text-[10px] text-amber-600   mb-1">Received Qty</p>
                    <p className="text-xs text-gray-900 font-semibold">{jobCard?.received_qty || 0} Units</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="bg-white rounded p-2 border border-gray-100   space-y-2 col-span-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-amber-50 p-2 rounded  text-amber-600">
                  <Layers size={18} />
                </div>
                <h4 className="text-xs  text-gray-900 ">Intelligence Notes</h4>
              </div>
              <div className="p-2 bg-amber-50/30 rounded  border border-amber-100">
                <p className="text-xs  text-amber-900/70 whitespace-pre-wrap leading-relaxed">
                  {jobCard?.notes || 'No supplemental operational data recorded for this phase.'}
                </p>
              </div>
            </div>
          </div>

          {timeLogs.length > 0 && (
            (() => {
              const approvedRejectionsList = Array.isArray(rejections) ? rejections.filter(r => r.status === 'Approved') : []
              const totalLossQty = approvedRejectionsList.reduce((sum, r) => sum + Math.max(Number(r.rejected_qty) || 0, Number(r.scrap_qty) || 0), 0)
              const actualUptimeHours = (metrics.actualProductionMinutes / 60).toFixed(2)
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-indigo-50/50 p-2 rounded border border-indigo-100">
                    <p className="text-xs   text-indigo-400">Actual Uptime</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-md   text-indigo-900 ">{actualUptimeHours}</span>
                      <span className="text-xs  text-indigo-400">Hours</span>
                    </div>
                  </div>
                  <div className="bg-amber-50/50 p-2 rounded  border border-amber-100">
                    <p className="text-xs   text-amber-400  mb-2">Downtime</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-md   text-amber-900 ">{metrics.downtimeMinutes}</span>
                      <span className="text-xs  text-amber-400">Mins</span>
                    </div>
                  </div>
                  <div className="bg-rose-50/50 p-2 rounded  border border-rose-100">
                    <p className="text-xs   text-rose-400  mb-2">Rejected (Scrap)</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-md   text-rose-900 ">{totalLossQty}</span>
                      <span className="text-xs  text-rose-400">Units</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded  border border-emerald-100">
                    <p className="text-xs   text-emerald-400  mb-2">Operational Rank</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-md   text-emerald-900 ">Grade A</span>
                    </div>
                  </div>
                </div>
              )
            })()
          )}

          {dailyLogs.length > 0 && (
            <div className="bg-white rounded  border border-gray-100 overflow-hidden">
              <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1 rounded    text-indigo-600">
                    <Activity size={15} />
                  </div>
                  <h4 className="text-xs  text-gray-900 ">Production Intelligence Feed</h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded  animate-pulse" />
                  <span className="text-xs   text-gray-400 ">Real-time Data Sync</span>
                </div>
              </div>
              <DataTable 
                disablePagination={true}
                columns={[
                  { 
                    key: 'day_number', 
                    label: 'Timeline Sequence',
                    render: (_, log) => (
                      <div className="flex flex-col">
                        <span className="text-xs  text-gray-900 ">Day {log.day_number || '-'}</span>
                        <span className="text-xs   text-gray-400 ">{new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    )
                  },
                  { 
                    key: 'shift', 
                    label: 'Operational Shift',
                    render: (shift) => (
                      <div className="">
                        <span className={`p-2 rounded  text-xs    border transition-colors ${
                          shift === 'A' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          shift === 'B' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                          'bg-gray-50 text-gray-600 border-gray-100'
                        }`}>
                          Shift {shift}
                        </span>
                      </div>
                    )
                  },
                  { 
                    key: 'produced', 
                    label: 'Gross Output',
                    render: (val) => <div className=" text-gray-900 text-xs">{val}</div>
                  },
                  { 
                    key: 'accepted', 
                    label: 'Validated Yield',
                    render: (val) => (
                      <div className="">
                        <span className="p-2 py-1 bg-emerald-50 text-emerald-600 rounded text-sm">{val}</span>
                      </div>
                    )
                  },
                  { 
                    key: 'scrap', 
                    label: 'Rejected (Scrap)',
                    render: (val) => <div className=" text-rose-500 text-sm">{val}</div>
                  },
                  { 
                    key: 'downtime', 
                    label: 'Downtime Index',
                    render: (val) => <div className=" text-amber-500 text-xs">{val}m</div>
                  }
                ]}
                data={dailyLogs}
              />
              <div className="bg-gray-900 text-white p-2 flex justify-between items-center text-xs ">
                <span className="text-xs text-gray-500">Aggregate Yield Matrix</span>
                <div className="flex gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase">Gross</span>
                    <span className="text-white">{dailyLogs.reduce((sum, l) => sum + l.produced, 0)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-emerald-500 uppercase">Yield</span>
                    <span className="text-emerald-400">{dailyLogs.reduce((sum, l) => sum + l.accepted, 0)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-rose-500 uppercase">Rejected</span>
                    <span className="text-rose-400">{dailyLogs.reduce((sum, l) => sum + l.scrap, 0)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-amber-500 uppercase">Downtime</span>
                    <span className="text-amber-400">{dailyLogs.reduce((sum, l) => sum + l.downtime, 0)}m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {timeLogs.length > 0 && (
            <div className="bg-white rounded  border border-gray-100   overflow-hidden">
              <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded    text-indigo-600">
                    <Clock size={15} />
                  </div>
                  <h4 className="text-xs  text-gray-900 ">Temporal Intelligence Logs</h4>
                </div>
              </div>
              <DataTable 
                disablePagination={true}
                columns={[
                  { 
                    key: 'day_number', 
                    label: 'Phase Day',
                    render: (val) => <div className="text-sm text-gray-900">D{val || '-'}</div>
                  },
                  { 
                    key: 'from_time', 
                    label: 'Duration Window',
                    render: (_, log) => (
                      <div className="flex items-center gap-2 text-xs  text-gray-500">
                        <span>{format12h(log.from_time) || '-'}</span>
                        <ChevronRight size={10} className="text-gray-300" />
                        <span>{format12h(log.to_time) || '-'}</span>
                      </div>
                    )
                  },
                  { 
                    key: 'shift', 
                    label: 'Shift',
                    render: (shift) => (
                      <div className="">
                        <span className="p-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{shift}</span>
                      </div>
                    )
                  },
                  { 
                    key: 'completed_qty', 
                    label: 'Gross',
                    render: (val) => <div className=" text-gray-600 text-xs">{val}</div>
                  },
                  { 
                    key: 'rejected_qty', 
                    label: 'Rejected',
                    render: (_, log) => (
                      <div className=" text-rose-400 text-xs">
                        {Math.max(Number(log.rejected_qty || 0), Number(log.scrap_qty || 0))}
                      </div>
                    )
                  },
                  { 
                    key: 'net_yield', 
                    label: 'Net Yield',
                    render: (_, log) => (
                      <div className=" text-emerald-600 text-sm">
                        {Number(log.completed_qty || 0) - Math.max(Number(log.rejected_qty || 0), Number(log.scrap_qty || 0))}
                      </div>
                    )
                  }
                ]}
                data={timeLogs}
              />
            </div>
          )}

          {rejections.length > 0 && (
            <div className="bg-white rounded  border border-rose-100   overflow-hidden">
              <div className="p-2 border-b border-rose-50 flex items-center justify-between bg-rose-50/20">
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded text-rose-600">
                    <AlertCircle size={10} />
                  </div>
                  <h4 className="text-xs  text-gray-900  text-rose-900">Quality Deficiency Report</h4>
                </div>
              </div>
              <DataTable 
                disablePagination={true}
                columns={[
                  { 
                    key: 'day_number', 
                    label: 'Incident',
                    render: (_, rej) => (
                      <div className="flex flex-col">
                        <span className="text-xs text-rose-900">Day {rej.day_number || '-'}({rej.shift || 'A'})</span>
                      </div>
                    )
                  },
                  { 
                    key: 'rejection_reason', 
                    label: 'Defect Reason',
                    render: (val, rej) => <div className="text-xs text-gray-600 italic">"{val || rej.reason || '-'}"</div>
                  },
                  { 
                    key: 'rejected_qty', 
                    label: 'Rejected (Scrap)',
                    render: (_, rej) => (
                      <div className=" text-rose-600 text-xs ">
                        {Math.max(Number(rej.rejected_qty || 0), Number(rej.scrap_qty || 0))}
                      </div>
                    )
                  }
                ]}
                data={rejections}
              />
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="group flex items-center gap-3 p-2   text-xs   text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              Terminate View
            </button>
            
            <div className="flex items-center gap-4">
              {jobCard?.status !== 'completed' && jobCard?.status !== 'cancelled' && (
                <button
                  onClick={handleNextStep}
                  disabled={updatingStatus}
                  className="flex items-center gap-4 p-2  bg-gray-900 text-white rounded hover:bg-gray-800 transition-all  shadow-gray-200 active:scale-95 group"
                >
                  <div className="bg-indigo-500 p-1 rounded group-hover:rotate-12 transition-transform">
                    <Zap size={15} className="fill-current text-white" />
                  </div>
                  <span className="text-xs  ">
                    {updatingStatus ? 'Syncing...' : `Transition to ${String(getNextStatus(jobCard?.status) || '').replace('-', ' ')}`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
