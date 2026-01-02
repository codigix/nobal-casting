import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Badge from '../Badge/Badge'
import Alert from '../Alert/Alert'
import { Printer, CheckCircle, XCircle, Trash2 } from 'lucide-react'

export default function ViewMaterialRequestModal({ isOpen, onClose, mrId, onStatusChange }) {
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [selectedSourceWarehouse, setSelectedSourceWarehouse] = useState('')

  useEffect(() => {
    if (isOpen && mrId) {
      fetchRequestDetails()
      fetchWarehouses()
    } else {
      setRequest(null)
      setError(null)
      setSuccess(null)
      setSelectedSourceWarehouse('')
    }
  }, [isOpen, mrId])

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchRequestDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/material-requests/${mrId}`)
      setRequest(response.data.data)
      setError(null)
      setSelectedSourceWarehouse('')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material request details')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      const isTransferOrIssue = ['material_transfer', 'material_issue'].includes(request?.purpose)
      const finalWarehouse = selectedSourceWarehouse || request?.source_warehouse
      
      if (isTransferOrIssue && !finalWarehouse) {
        setError('Source warehouse is required for Material Transfer/Issue. Please select one.')
        return
      }

      const payload = { 
        approvedBy: 'User'
      }
      
      if (isTransferOrIssue) {
        payload.source_warehouse = finalWarehouse
      }
      
      console.log('Approving MR with payload:', payload)
      await api.patch(`/material-requests/${mrId}/approve`, payload)
      setSuccess('Material request approved successfully')
      setSelectedSourceWarehouse('')
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async () => {
    const reason = prompt('Please enter rejection reason:')
    if (reason === null) return // Cancelled

    try {
      await api.patch(`/material-requests/${mrId}/reject`, { reason })
      setSuccess('Material request rejected')
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this material request?')) {
      try {
        await api.delete(`/material-requests/${mrId}`)
        onClose()
        if (onStatusChange) onStatusChange()
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete')
      }
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',
      approved: 'success',
      converted: 'secondary',
      cancelled: 'danger'
    }
    return colors[status] || 'secondary'
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Material Request: ${mrId || ''}`} size="xl">
      <div className="p-1">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-neutral-600 mt-4">Loading details...</p>
          </div>
        ) : error && !request ? (
          <Alert type="danger">{error}</Alert>
        ) : request ? (
          <>
            {error && <Alert type="danger" className="mb-4">{error}</Alert>}
            {success && <Alert type="success" className="mb-4">{success}</Alert>}

            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <Badge color={getStatusColor(request.status)} size="lg">
                  {request.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">
                  Created on {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex gap-2 items-center">
                {request.status === 'draft' && (
                  <>
                    {['material_transfer', 'material_issue'].includes(request?.purpose) && (
                      <select
                        value={selectedSourceWarehouse || request?.source_warehouse || ''}
                        onChange={(e) => setSelectedSourceWarehouse(e.target.value)}
                        className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                          !selectedSourceWarehouse && !request?.source_warehouse 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-primary-500'
                        }`}
                        required
                      >
                        <option value="">Select Source Warehouse *</option>
                        {warehouses && warehouses.length > 0 ? (
                          warehouses.map((w) => (
                            <option key={w.id} value={w.warehouse_code || w.warehouse_name || w.id}>
                              {w.warehouse_name} ({w.warehouse_code})
                            </option>
                          ))
                        ) : (
                          <option disabled>No warehouses available</option>
                        )}
                      </select>
                    )}
                    <Button 
                      onClick={handleApprove}
                      variant="success"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle size={16} /> Approve
                    </Button>
                    <Button 
                      onClick={handleReject}
                      variant="danger"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </Button>
                    <Button 
                      onClick={handleDelete}
                      variant="outline-danger"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  </>
                )}
                {/* <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Printer size={16} /> Print
                </Button> */}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Request Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Series No:</span>
                    <span className="text-sm font-medium">{request.series_no || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Requested By:</span>
                    <span className="text-sm font-medium">{request.requested_by_name || request.requested_by_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Department:</span>
                    <span className="text-sm font-medium">{request.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Purpose:</span>
                    <span className="text-sm font-medium capitalize">{request.purpose.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Logistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Required By:</span>
                    <span className="text-sm font-medium">
                      {request.required_by_date ? new Date(request.required_by_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Target Warehouse:</span>
                    <span className="text-sm font-medium">{request.target_warehouse || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Source Warehouse:</span>
                    <span className="text-sm font-medium">{request.source_warehouse || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Transition Date:</span>
                    <span className="text-sm font-medium">
                      {request.transition_date ? new Date(request.transition_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Items</h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-4 py-3">Item Code</th>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-center">UOM</th>
                      {/* <th className="px-4 py-3">Purpose</th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {request.items && request.items.length > 0 ? (
                      request.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.item_code}</td>
                          <td className="px-4 py-3 text-gray-600">{item.item_name || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium">{item.qty}</td>
                          <td className="px-4 py-3 text-center text-gray-500">{item.uom}</td>
                          {/* <td className="px-4 py-3 text-gray-500">{item.purpose || '-'}</td> */}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                          No items found in this request
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {request.items_notes && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <h4 className="text-sm font-bold text-yellow-800 mb-2">Notes</h4>
                <p className="text-sm text-yellow-800 whitespace-pre-wrap">{request.items_notes}</p>
              </div>
            )}
            
            <div className="mt-8 flex justify-end">
               <Button onClick={onClose} variant="secondary">Close</Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}