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
            <p className="text-sm p-3 bg-gray-50 rounded min-h-15 whitespace-pre-wrap">
              {jobCard?.notes || 'No notes'}
            </p>
          </div>

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
