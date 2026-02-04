import React, { useState, useEffect } from 'react'
import { 
  AlertCircle, CheckCircle, Clock, Package, Activity, Factory, 
  User, Calendar, Trash2, Zap, TrendingUp, Layers, ChevronRight, X
} from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'
import { useToast } from '../ToastContainer'

export default function ViewJobCardModal({ isOpen, onClose, onSuccess, jobCardId }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [jobCard, setJobCard] = useState(null)
  const [timeLogs, setTimeLogs] = useState([])
  const [rejections, setRejections] = useState([])
  const [downtimes, setDowntimes] = useState([])
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
      setJobCard(jobCardRes.data)
      setNewStatus(jobCardRes.data?.status || '')
      setTimeLogs(timeLogsRes.data || [])
      setRejections(rejectionsRes.data || [])
      setDowntimes(downtimesRes.data || [])
    } catch (err) {
      toast.addToast(err.message || 'Failed to load job card details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const statusWorkflow = {
    'draft': ['pending', 'cancelled'],
    'pending': ['in-progress', 'cancelled'],
    'in-progress': ['completed', 'cancelled'],
    'completed': ['completed'],
    'cancelled': ['cancelled']
  }

  const getAllowedStatuses = (currentStatus) => {
    return statusWorkflow[(currentStatus || '').toLowerCase()] || []
  }

  const getNextStatus = (currentStatus) => {
    const allowed = getAllowedStatuses(currentStatus)
    return allowed[0] || currentStatus
  }

  const handleNextStep = async () => {
    const nextStatus = getNextStatus(jobCard?.status)
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

    // Group time logs by date and shift
    timeLogs.forEach(log => {
      const dateVal = log.log_date || (log.created_at ? log.created_at.split('T')[0] : null)
      if (!dateVal) return
      const shift = log.shift || 'A'
      const key = `${dateVal}-${shift}`

      if (!logsMap[key]) {
        logsMap[key] = { date: dateVal, shift, produced: 0, accepted: 0, rejected: 0, downtime: 0, day_number: log.day_number }
      }
      logsMap[key].produced += Number(log.completed_qty) || 0
    })

    // Group rejections by date and shift
    rejections.forEach(rej => {
      const dateVal = rej.log_date || (rej.created_at ? rej.created_at.split('T')[0] : null)
      if (!dateVal) return
      const shift = rej.shift || 'A'
      const key = `${dateVal}-${shift}`
      
      if (!logsMap[key]) {
        logsMap[key] = { date: dateVal, shift, produced: 0, accepted: 0, rejected: 0, downtime: 0, day_number: rej.day_number }
      }
      logsMap[key].rejected += Number(rej.rejected_qty) || 0
      // If we don't have production logs for this shift, we might have accepted qty recorded in rejection entry
      if (logsMap[key].produced === 0 && rej.accepted_qty) {
        logsMap[key].produced += (Number(rej.accepted_qty) + Number(rej.rejected_qty))
      }
    })

    // Calculate accepted for each log
    Object.keys(logsMap).forEach(key => {
      logsMap[key].accepted = Math.max(0, logsMap[key].produced - logsMap[key].rejected)
    })

    // Group downtimes by date and shift
    downtimes.forEach(dt => {
      const dateVal = dt.log_date || (dt.created_at ? dt.created_at.split('T')[0] : null)
      if (!dateVal) return
      const shift = dt.shift || 'A'
      const key = `${dateVal}-${shift}`
      
      if (!logsMap[key]) {
        logsMap[key] = { date: dateVal, shift, produced: 0, accepted: 0, rejected: 0, downtime: 0, day_number: dt.day_number }
      }
      logsMap[key].downtime += Number(dt.duration_minutes) || 0
    })

    return Object.values(logsMap).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.shift.localeCompare(b.shift)
    })
  }

  if (!jobCard && !loading) {
    return null
  }

  const dailyLogs = getDailyLogs()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Operational Intelligence" size="3xl">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-6 h-6  border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-xs  text-gray-400  text-center">Decrypting Operational Data...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* High-Level Overview */}
          <div className="bg-gray-900 rounded  p-2 text-white  relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2  py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs    border border-indigo-500/30">
                      ID: {jobCard?.job_card_id}
                    </span>
                    <span className={`p-2  py-1 rounded-full text-xs    border ${
                      jobCard?.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      jobCard?.status === 'in-progress' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                      'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                      {jobCard?.status?.replace('-', ' ')}
                    </span>
                  </div>
                  <h2 className="text-xl  text-white tracking-tighter leading-none">{jobCard?.operation || 'Process Phase'}</h2>
                  <p className="text-gray-400   text-xs  mt-1">Work Order: {jobCard?.work_order_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs   text-gray-500  mb-1">Quality Yield</p>
                  <div className="text-xl  tracking-tighter text-indigo-400">
                    {jobCard?.produced_quantity > 0 ? Math.round(((jobCard?.accepted_quantity || 0) / jobCard?.produced_quantity) * 100) : 0}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2 border-t border-white/10">
                <div className="">
                  <p className="text-xs   text-gray-500 ">Planned Capacity</p>
                  <p className="text-sm  tracking-tight">{jobCard?.planned_quantity} <span className="text-xs text-gray-500">Units</span></p>
                </div>
                <div className="">
                  <p className="text-xs   text-gray-500 ">Accepted Output</p>
                  <p className="text-sm  tracking-tight text-emerald-400">{jobCard?.accepted_quantity || 0} <span className="text-xs text-emerald-500/50">Units</span></p>
                  <p className="text-[10px] text-gray-500">Total Produced: {jobCard?.produced_quantity || 0}</p>
                </div>
                <div className="">
                  <p className="text-xs   text-gray-500 ">Assigned Unit</p>
                  <p className="text-sm  tracking-tight truncate">{jobCard?.machine_id || 'N/A'}</p>
                </div>
                <div className="">
                  <p className="text-xs   text-gray-500 ">Operator</p>
                  <p className="text-sm  tracking-tight truncate">{jobCard?.operator_id || 'Unassigned'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div className="bg-white rounded p-2 border border-gray-100   space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-indigo-50 p-2 rounded  text-indigo-600">
                  <Calendar size={18} />
                </div>
                <h4 className="text-xs  text-gray-900 ">Operational Timeline</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-2 bg-gray-50 rounded  border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Scheduled Start</p>
                  <p className="text-xs  text-gray-900 tracking-tight">
                    {jobCard?.scheduled_start_date ? new Date(jobCard.scheduled_start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded  border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Estimated End</p>
                  <p className="text-xs  text-gray-900 tracking-tight">
                    {jobCard?.scheduled_end_date ? new Date(jobCard.scheduled_end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
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
                  <p className="text-xs  text-gray-900 tracking-tight">
                    ₹{parseFloat(jobCard?.hourly_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2 bg-gray-50 rounded  border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Planned Cost</p>
                  <p className="text-xs  text-gray-900 tracking-tight">
                    ₹{parseFloat(jobCard?.operating_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
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
              const totalActualMinutes = timeLogs.reduce((sum, log) => {
                if (log.from_time && log.to_time) {
                  const [fh, fm] = log.from_time.split(':').map(Number)
                  const [th, tm] = log.to_time.split(':').map(Number)
                  return sum + Math.max(0, (th * 60 + tm) - (fh * 60 + fm))
                }
                return sum
              }, 0)
              const totalActualHours = (totalActualMinutes / 60).toFixed(2)
              const totalRejectedQty = Array.isArray(rejections) ? rejections.reduce((sum, r) => sum + (Number(r.rejected_qty) || 0), 0) : 0
              const totalDowntimeMinutes = Array.isArray(downtimes) ? downtimes.reduce((sum, dt) => sum + (Number(dt.duration_minutes) || 0), 0) : 0
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50/50 p-2 rounded border border-indigo-100">
                    <p className="text-xs   text-indigo-400  mb-2">Actual Uptime</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl   text-indigo-900 tracking-tight">{totalActualHours}</span>
                      <span className="text-xs  text-indigo-400">Hours</span>
                    </div>
                  </div>
                  <div className="bg-amber-50/50 p-2 rounded  border border-amber-100">
                    <p className="text-xs   text-amber-400  mb-2">Downtime</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl   text-amber-900 tracking-tight">{totalDowntimeMinutes}</span>
                      <span className="text-xs  text-amber-400">Mins</span>
                    </div>
                  </div>
                  <div className="bg-rose-50/50 p-2 rounded  border border-rose-100">
                    <p className="text-xs   text-rose-400  mb-2">Rejections</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl   text-rose-900 tracking-tight">{totalRejectedQty}</span>
                      <span className="text-xs  text-rose-400">Units</span>
                    </div>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded  border border-emerald-100">
                    <p className="text-xs   text-emerald-400  mb-2">Operational Rank</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl   text-emerald-900 tracking-tight">Grade A</span>
                    </div>
                  </div>
                </div>
              )
            })()
          )}

          {dailyLogs.length > 0 && (
            <div className="bg-white rounded  border border-gray-100   overflow-hidden">
              <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded    text-indigo-600">
                    <Activity size={20} />
                  </div>
                  <h4 className="text-xs  text-gray-900 ">Production Intelligence Feed</h4>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-xs   text-gray-400 ">Real-time Data Sync</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="p-2  text-xs   text-gray-400  text-left">Timeline Sequence</th>
                      <th className="p-2  text-xs   text-gray-400  text-center">Operational Shift</th>
                      <th className="p-2  text-xs   text-gray-900  text-right">Gross Output</th>
                      <th className="p-2  text-xs   text-emerald-500  text-right">Validated Yield</th>
                      <th className="p-2  text-xs   text-rose-500  text-right">Rejection Rate</th>
                      <th className="p-2  text-xs   text-amber-500  text-right">Downtime Index</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dailyLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-all duration-300 group">
                        <td className="p-2 ">
                          <div className="flex flex-col">
                            <span className="text-xs  text-gray-900 tracking-tight">Day {log.day_number || '-'}</span>
                            <span className="text-xs   text-gray-400 ">{new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </td>
                        <td className="p-2  text-center">
                          <span className={`px-4 py-1.5 rounded-full text-xs    border transition-colors ${
                            log.shift === 'A' ? 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100' : 
                            log.shift === 'B' ? 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-100' : 
                            'bg-gray-50 text-gray-600 border-gray-100 group-hover:bg-gray-100'
                          }`}>
                            Shift {log.shift}
                          </span>
                        </td>
                        <td className="p-2  text-right  text-gray-900 text-sm tracking-tight">{log.produced}</td>
                        <td className="p-2  text-right">
                          <span className="p-2  py-1 bg-emerald-50 text-emerald-600 rounded  text-sm tracking-tight">{log.accepted}</span>
                        </td>
                        <td className="p-2  text-right  text-rose-500 text-sm tracking-tight">{log.rejected}</td>
                        <td className="p-2  text-right  text-amber-500 text-sm tracking-tight">{log.downtime}m</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-900 text-white">
                    <tr>
                      <td colSpan="2" className="p-2  text-xs    text-gray-500">Aggregate Yield Matrix</td>
                      <td className="p-2  text-right  text-white text-base tracking-tighter">{dailyLogs.reduce((sum, l) => sum + l.produced, 0)}</td>
                      <td className="p-2  text-right  text-emerald-400 text-base tracking-tighter">{dailyLogs.reduce((sum, l) => sum + l.accepted, 0)}</td>
                      <td className="p-2  text-right  text-rose-400 text-base tracking-tighter">{dailyLogs.reduce((sum, l) => sum + l.rejected, 0)}</td>
                      <td className="p-2  text-right  text-amber-400 text-base tracking-tighter">{dailyLogs.reduce((sum, l) => sum + l.downtime, 0)}m</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {timeLogs.length > 0 && (
            <div className="bg-white rounded  border border-gray-100   overflow-hidden">
              <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded    text-indigo-600">
                    <Clock size={20} />
                  </div>
                  <h4 className="text-xs  text-gray-900 ">Temporal Intelligence Logs</h4>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="p-2  text-xs   text-gray-400  text-left">Phase Day</th>
                      <th className="p-2  text-xs   text-gray-400  text-left">Duration Window</th>
                      <th className="p-2  text-xs   text-gray-400  text-center">Shift</th>
                      <th className="p-2  text-xs   text-gray-900  text-right">Yield</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {timeLogs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-2  text-sm  text-gray-900">D{log.day_number || '-'}</td>
                        <td className="p-2 ">
                          <div className="flex items-center gap-2 text-xs  text-gray-500">
                            <span>{format12h(log.from_time) || '-'}</span>
                            <ChevronRight size={10} className="text-gray-300" />
                            <span>{format12h(log.to_time) || '-'}</span>
                          </div>
                        </td>
                        <td className="p-2  text-center">
                          <span className="p-2  py-1 bg-gray-100 text-gray-600 rounded text-xs   ">{log.shift}</span>
                        </td>
                        <td className="p-2  text-right  text-gray-900 text-sm tracking-tight">{log.completed_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rejections.length > 0 && (
            <div className="bg-white rounded  border border-rose-100   overflow-hidden">
              <div className="px-10 py-8 border-b border-rose-50 flex items-center justify-between bg-rose-50/20">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded    text-rose-600">
                    <AlertCircle size={20} />
                  </div>
                  <h4 className="text-xs  text-gray-900  text-rose-900">Quality Deficiency Report</h4>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-rose-50/30">
                      <th className="p-2  text-xs   text-rose-400  text-left">Incident</th>
                      <th className="p-2  text-xs   text-rose-400  text-left">Defect Reason</th>
                      <th className="p-2  text-xs   text-rose-600  text-right">Qty Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-50">
                    {rejections.map((rej, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/50 transition-colors">
                        <td className="p-2 ">
                          <div className="flex flex-col">
                            <span className="text-sm  text-rose-900 tracking-tight">Day {rej.day_number || '-'}</span>
                            <span className="text-xs   text-rose-400 ">Shift {rej.shift || 'A'}</span>
                          </div>
                        </td>
                        <td className="p-2  text-xs  text-gray-600 italic">"{rej.rejection_reason || rej.reason || '-'}"</td>
                        <td className="p-2  text-right  text-rose-600 text-sm tracking-tight">{rej.rejected_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                  className="flex items-center gap-4 px-12 py-2  bg-gray-900 text-white rounded hover:bg-gray-800 transition-all shadow-2xl shadow-gray-200 active:scale-95 group"
                >
                  <div className="bg-indigo-500 p-1.5 rounded group-hover:rotate-12 transition-transform">
                    <Zap size={18} className="fill-current text-white" />
                  </div>
                  <span className="text-xs  ">
                    {updatingStatus ? 'Syncing...' : `Transition to ${getNextStatus(jobCard?.status).replace('-', ' ')}`}
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
