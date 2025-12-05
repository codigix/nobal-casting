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
      const response = await productionService.getJobCardDetails(jobCardId)
      setJobCard(response.data)
      setNewStatus(response.data?.status || '')
    } catch (err) {
      toast.addToast(err.message || 'Failed to load job card details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const statusWorkflow = {
    'draft': 'pending',
    'pending': 'in-progress',
    'in-progress': 'completed',
    'completed': 'completed'
  }

  const handleNextStep = async () => {
    const nextStatus = statusWorkflow[jobCard?.status] || 'pending'
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
    <Modal isOpen={isOpen} onClose={onClose} title="View Job Card" size="lg">
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

          <div className="mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Update Status</label>
            <select 
              value={newStatus} 
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-2 py-2 border border-gray-300 rounded"
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
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
