import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
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

  if (!jobCard && !loading) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="View Job Card" size="2xl">
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Job Card ID</label>
              <p className="text-base font-semibold">{jobCard?.job_card_id}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Work Order</label>
              <p className="text-base font-semibold">{jobCard?.work_order_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Operation</label>
              <p className="text-base">{jobCard?.operation || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Machine</label>
              <p className="text-base">{jobCard?.machine_id || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Planned Qty</label>
              <p className="text-base">{jobCard?.planned_quantity}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Produced Qty</label>
              <p className="text-base">{jobCard?.produced_quantity || 0}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Operator</label>
              <p className="text-base">{jobCard?.operator_id || 'Unassigned'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
              <p className="text-base">
                {jobCard?.scheduled_start_date 
                  ? new Date(jobCard.scheduled_start_date).toLocaleDateString() 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
              <p className="text-base">
                {jobCard?.scheduled_end_date 
                  ? new Date(jobCard.scheduled_end_date).toLocaleDateString() 
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <p className="text-xs p-3 bg-gray-50 rounded min-h-15 whitespace-pre-wrap">
              {jobCard?.notes || 'No notes'}
            </p>
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
                <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xs">
                  <label className="block text-xs font-semibold text-gray-700 mb-3">⏱️ Performance Metrics</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <div className="text-gray-600 text-xs font-semibold mb-1">Actual Duration</div>
                      <div className="text-lg font-bold text-blue-600">{totalActualHours}h</div>
                      <div className="text-gray-500 text-xs mt-1">{totalActualMinutes} minutes</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-green-100">
                      <div className="text-gray-600 text-xs font-semibold mb-1">Downtime</div>
                      <div className="text-lg font-bold text-orange-600">{totalDowntimeMinutes}m</div>
                      <div className="text-gray-500 text-xs mt-1">Total inactive time</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-red-100">
                      <div className="text-gray-600 text-xs font-semibold mb-1">Rejections</div>
                      <div className="text-lg font-bold text-red-600">{Number(totalRejectedQty).toFixed(2)}</div>
                      <div className="text-gray-500 text-xs mt-1">Units rejected</div>
                    </div>
                    <div className={`bg-white p-3 rounded border ${jobCard?.status === 'completed' ? 'border-green-100' : 'border-amber-100'}`}>
                      <div className="text-gray-600 text-xs font-semibold mb-1">Status</div>
                      <div className={`text-lg font-bold ${jobCard?.status === 'completed' ? 'text-green-600' : jobCard?.status === 'in-progress' ? 'text-blue-600' : 'text-gray-600'}`}>
                        {jobCard?.status?.replace('-', ' ').toUpperCase()}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">Job card status</div>
                    </div>
                  </div>
                </div>
              )
            })()
          )}

          {timeLogs.length > 0 && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Time Logs ({timeLogs.length})</label>
              <div className="">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">From Time</th>
                      <th className="border p-2 text-left">To Time</th>
                      <th className="border p-2 text-left">Shift</th>
                      <th className="border p-2 text-right">Completed Qty</th>
                      <th className="border p-2 text-right">Accepted Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeLogs.map((log, idx) => (
                      <tr key={idx} className="border hover:bg-gray-50">
                        <td className="border p-2">{log.from_time || '-'}</td>
                        <td className="border p-2">{log.to_time || '-'}</td>
                        <td className="border p-2">{log.shift}</td>
                        <td className="border p-2 text-right">{log.completed_qty}</td>
                        <td className="border p-2 text-right">{log.accepted_qty || log.completed_qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rejections.length > 0 && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Rejections ({rejections.length})</label>
              <div className="">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">Reason</th>
                      <th className="border p-2 text-right">Qty</th>
                      <th className="border p-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejections.map((rej, idx) => (
                      <tr key={idx} className="border hover:bg-gray-50">
                        <td className="border p-2">{rej.rejection_reason || rej.reason || '-'}</td>
                        <td className="border p-2 text-right">{rej.rejected_qty}</td>
                        <td className="border p-2">{rej.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {downtimes.length > 0 && (
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Downtimes ({downtimes.length})</label>
              <div className="">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">From Time</th>
                      <th className="border p-2 text-left">To Time</th>
                      <th className="border p-2 text-left">Type</th>
                      <th className="border p-2 text-left">Reason</th>
                      <th className="border p-2 text-right">Duration (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downtimes.map((dt, idx) => (
                      <tr key={idx} className="border hover:bg-gray-50">
                        <td className="border p-2">{dt.from_time || '-'}</td>
                        <td className="border p-2">{dt.to_time || '-'}</td>
                        <td className="border p-2">{dt.downtime_type || dt.type || '-'}</td>
                        <td className="border p-2">{dt.downtime_reason || dt.reason || '-'}</td>
                        <td className="border p-2 text-right">{dt.duration_minutes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Update Status</label>
            <select 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded"
            >
              {(() => {
                const allowedStatuses = getAllowedStatuses(jobCard?.status)
                const statusLabels = {
                  'draft': 'Draft',
                  'pending': 'Pending',
                  'in-progress': 'In Progress',
                  'completed': 'Completed',
                  'cancelled': 'Cancelled'
                }
                return allowedStatuses.map(status => (
                  <option key={status} value={status}>{statusLabels[status] || status}</option>
                ))
              })()}
            </select>
            <p className="text-xs text-gray-600 mt-2">
              Current: <strong>{jobCard?.status}</strong>
            </p>
          </div>

          <div className="flex gap-2.5 justify-end">
            <button 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 rounded bg-gray-100 cursor-pointer hover:bg-gray-200 transition"
            >
              Close
            </button>
            <button 
              onClick={async () => await updateStatus(newStatus)}
              disabled={updatingStatus || newStatus === jobCard?.status}
              className={`px-4 py-2 bg-amber-500 text-white rounded font-semibold cursor-pointer transition ${
                updatingStatus || newStatus === jobCard?.status ? 'opacity-60 cursor-not-allowed' : 'hover:bg-amber-600'
              }`}
            >
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </button>
            <button 
              onClick={handleNextStep}
              disabled={updatingStatus}
              className={`px-4 py-2 bg-emerald-500 text-white rounded font-semibold cursor-pointer flex items-center gap-1.5 transition ${
                updatingStatus ? 'opacity-60 cursor-not-allowed' : 'hover:bg-emerald-600'
              }`}
            >
              <CheckCircle size={16} />
              {updatingStatus ? 'Processing...' : 'Next Step'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
